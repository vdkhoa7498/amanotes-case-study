/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { KudosService } from './kudos.service';
import { Kudo } from './entities/kudo.entity';
import { KudoRecipient } from './entities/kudo-recipient.entity';
import { CoreValue } from './entities/core-value.entity';
import { KudoComment } from './entities/kudo-comment.entity';
import { KudoReaction } from './entities/kudo-reaction.entity';
import { UsersService } from '../users/users.service';
import { MonthlyGivingBudgetService } from './services/monthly-giving-budget.service';
import { MqttShoutoutBridgeService } from '../notifications/mqtt-shoutout-bridge.service';
import { AppException } from '../common/errors';
import { User } from '../users/entities/user.entity';
import type { CreateKudoDto } from './dto/create-kudo.dto';

function makeUser(id: string): User {
  return {
    id,
    fullName: `User ${id}`,
    email: `${id}@test.com`,
    avatar: null,
  } as User;
}

function makeChainableQb() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'innerJoinAndSelect',
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orWhere',
    'orderBy',
    'addOrderBy',
    'take',
    'skip',
    'clone',
    'select',
    'addSelect',
    'setParameters',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  qb['getCount'] = jest.fn().mockResolvedValue(0);
  qb['getRawOne'] = jest.fn().mockResolvedValue(undefined);
  return qb;
}

function makeRepo() {
  return {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((_cls, data) => ({ ...(data ?? _cls) })),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(makeChainableQb()),
    manager: { transaction: jest.fn(), query: jest.fn() },
  };
}

const SENDER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const RECIPIENT_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const CORE_VALUE_STUB = {
  id: 'cccccccc-0000-0000-0000-000000000001',
  slug: 'teamwork',
  name: 'Teamwork',
  isActive: true,
};

describe('KudosService', () => {
  let service: KudosService;
  let coreValuesRepo: ReturnType<typeof makeRepo>;
  let kudosRepo: ReturnType<typeof makeRepo>;
  let usersService: { findByIds: jest.Mock };
  let budgetService: {
    withBudgetLock: jest.Mock;
    tryConsumeBudget: jest.Mock;
    monthlyCap: jest.Mock;
  };
  let shoutoutBridge: { publishRecipientShoutout: jest.Mock };

  const sender = makeUser(SENDER_ID);

  const baseDto: CreateKudoDto = {
    coreValueId: CORE_VALUE_STUB.id,
    description: 'Amazing teamwork!',
    recipients: [{ userId: RECIPIENT_ID, points: 20 }],
  };

  beforeEach(async () => {
    coreValuesRepo = makeRepo();
    kudosRepo = makeRepo();
    usersService = { findByIds: jest.fn() };
    budgetService = {
      withBudgetLock: jest.fn(),
      tryConsumeBudget: jest.fn(),
      monthlyCap: jest.fn().mockReturnValue(200),
    };
    shoutoutBridge = { publishRecipientShoutout: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KudosService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('') },
        },
        { provide: getRepositoryToken(Kudo), useValue: kudosRepo },
        { provide: getRepositoryToken(KudoRecipient), useValue: makeRepo() },
        { provide: getRepositoryToken(CoreValue), useValue: coreValuesRepo },
        { provide: getRepositoryToken(KudoComment), useValue: makeRepo() },
        { provide: getRepositoryToken(KudoReaction), useValue: makeRepo() },
        { provide: UsersService, useValue: usersService },
        { provide: MonthlyGivingBudgetService, useValue: budgetService },
        { provide: MqttShoutoutBridgeService, useValue: shoutoutBridge },
      ],
    }).compile();

    service = module.get(KudosService);
  });

  // ──────────────────────────────────────────────
  // Self-giving prevention
  // ──────────────────────────────────────────────
  describe('self-giving prevention', () => {
    it('throws AppException when sender is in the recipient list', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [{ userId: SENDER_ID, points: 20 }],
      };
      await expect(service.createKudo(sender, dto)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('error message identifies the self-give constraint', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [{ userId: SENDER_ID, points: 20 }],
      };
      const err = await service.createKudo(sender, dto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).toMatch(/chính mình/i);
    });

    it('does not trigger self-give error when sender is not in recipients', async () => {
      // Let the flow proceed past self-give check and fail at core value lookup
      coreValuesRepo.findOne.mockResolvedValue(null);
      const err = await service.createKudo(sender, baseDto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).not.toMatch(/chính mình/i);
    });
  });

  // ──────────────────────────────────────────────
  // Duplicate recipient prevention
  // ──────────────────────────────────────────────
  describe('duplicate recipient prevention', () => {
    it('throws AppException when the same userId appears twice in recipients', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [
          { userId: RECIPIENT_ID, points: 20 },
          { userId: RECIPIENT_ID, points: 15 },
        ],
      };
      await expect(service.createKudo(sender, dto)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('error message identifies the duplicate constraint', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [
          { userId: RECIPIENT_ID, points: 20 },
          { userId: RECIPIENT_ID, points: 15 },
        ],
      };
      const err = await service.createKudo(sender, dto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).toMatch(/trùng/i);
    });

    it('does not trigger duplicate error for two distinct recipient IDs', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [
          { userId: RECIPIENT_ID, points: 20 },
          { userId: 'dddddddd-0000-0000-0000-000000000002', points: 15 },
        ],
      };
      // Let the flow fail at core value — not at duplicate check
      coreValuesRepo.findOne.mockResolvedValue(null);
      const err = await service.createKudo(sender, dto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).not.toMatch(/trùng/i);
    });
  });

  // ──────────────────────────────────────────────
  // Core value validation
  // ──────────────────────────────────────────────
  describe('core value validation', () => {
    it('throws when the core value is not found in DB', async () => {
      coreValuesRepo.findOne.mockResolvedValue(null);
      await expect(service.createKudo(sender, baseDto)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('throws when the core value is inactive', async () => {
      coreValuesRepo.findOne.mockResolvedValue(null); // findOne with isActive:true returns null
      const err = await service.createKudo(sender, baseDto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).toMatch(/core value/i);
    });
  });

  // ──────────────────────────────────────────────
  // Recipient existence check
  // ──────────────────────────────────────────────
  describe('recipient existence check', () => {
    it('throws when a recipient user does not exist', async () => {
      coreValuesRepo.findOne.mockResolvedValue(CORE_VALUE_STUB);
      usersService.findByIds.mockResolvedValue([]); // empty → user missing
      await expect(service.createKudo(sender, baseDto)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('throws when only some recipients exist (partial match)', async () => {
      const dto: CreateKudoDto = {
        ...baseDto,
        recipients: [
          { userId: RECIPIENT_ID, points: 20 },
          { userId: 'eeeeeeee-0000-0000-0000-000000000003', points: 10 },
        ],
      };
      coreValuesRepo.findOne.mockResolvedValue(CORE_VALUE_STUB);
      usersService.findByIds.mockResolvedValue([makeUser(RECIPIENT_ID)]); // only 1 of 2 found
      await expect(service.createKudo(sender, dto)).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // Monthly giving budget
  // ──────────────────────────────────────────────
  describe('monthly giving budget', () => {
    beforeEach(() => {
      coreValuesRepo.findOne.mockResolvedValue(CORE_VALUE_STUB);
      usersService.findByIds.mockResolvedValue([makeUser(RECIPIENT_ID)]);
    });

    it('throws when tryConsumeBudget returns null (over budget)', async () => {
      budgetService.withBudgetLock.mockImplementation(
        async (_u: string, _ym: Date, work: Function) => {
          budgetService.tryConsumeBudget.mockResolvedValue(null);
          const mockManager = {
            query: jest.fn(),
            save: jest.fn(),
            create: jest.fn().mockImplementation((_cls, data) => data),
          };
          return work(mockManager);
        },
      );
      await expect(service.createKudo(sender, baseDto)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('budget error message mentions ngân sách', async () => {
      budgetService.withBudgetLock.mockImplementation(
        async (_u: string, _ym: Date, work: Function) => {
          budgetService.tryConsumeBudget.mockResolvedValue(null);
          const mockManager = {
            query: jest.fn(),
            save: jest.fn(),
            create: jest.fn().mockImplementation((_cls, data) => data),
          };
          return work(mockManager);
        },
      );
      const err = await service.createKudo(sender, baseDto).catch((e) => e);
      const payload = (err as AppException).getResponse() as {
        message: string;
      };
      expect(payload.message).toMatch(/ngân sách/i);
    });

    it('proceeds past budget check when tryConsumeBudget returns usage row', async () => {
      const kudoStub = {
        id: 'ffff0000-0000-0000-0000-000000000001',
        status: 'ready',
        description: 'Amazing teamwork!',
        createdAt: new Date(),
        coreValue: CORE_VALUE_STUB,
        sender: makeUser(SENDER_ID),
        recipients: [
          {
            userId: RECIPIENT_ID,
            points: 20,
            recipient: makeUser(RECIPIENT_ID),
          },
        ],
      };

      budgetService.withBudgetLock.mockImplementation(
        async (_u: string, _ym: Date, work: Function) => {
          budgetService.tryConsumeBudget.mockResolvedValue({
            id: 'usage-uuid-001',
            pointsSpent: 20,
            version: 1,
          });
          const mockManager = {
            query: jest.fn(),
            save: jest
              .fn()
              .mockResolvedValueOnce({
                id: kudoStub.id,
                createdAt: kudoStub.createdAt,
              })
              .mockResolvedValue({}),
            create: jest.fn().mockImplementation((_cls, data) => ({ ...data })),
          };
          return work(mockManager);
        },
      );
      kudosRepo.findOneOrFail.mockResolvedValue(kudoStub);

      const result = await service.createKudo(sender, baseDto);
      expect(result.id).toBe(kudoStub.id);
      expect(result.recipients[0].points).toBe(20);
      expect(shoutoutBridge.publishRecipientShoutout).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────
  // listReceivedShoutouts — invalid cursor
  // ──────────────────────────────────────────────
  describe('listReceivedShoutouts', () => {
    it('throws AppException for a malformed cursor', () => {
      expect(() =>
        service.listReceivedShoutouts(SENDER_ID, {
          cursor: 'not-valid-base64url!!',
          limit: 10,
        }),
      ).toThrow(AppException);
    });

    it('throws AppException for a cursor with invalid JSON', () => {
      const bad = Buffer.from('not json', 'utf8').toString('base64url');
      expect(() =>
        service.listReceivedShoutouts(SENDER_ID, { cursor: bad, limit: 10 }),
      ).toThrow(AppException);
    });
  });
});
