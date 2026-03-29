/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { RewardCatalogItem } from './entities/reward-catalog-item.entity';
import { RewardRedemption } from './entities/reward-redemption.entity';
import { PointsService } from '../kudos/points.service';
import { DataSource } from 'typeorm';
import { AppException } from '../common/errors';
import { RewardRedemptionStatus } from './constants/redemption.constants';

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const IDEMPOTENCY_KEY = 'idem-key-abc-123';

function makeItem(
  overrides: Partial<RewardCatalogItem> = {},
): RewardCatalogItem {
  return {
    id: ITEM_ID,
    title: 'Company Hoodie',
    description: null,
    pointsCost: 500,
    imageUrl: null,
    stock: 10,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCatalogRepo() {
  return { find: jest.fn(), findOne: jest.fn() };
}

function makeRedemptionsRepo() {
  return {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn(),
  };
}

function makePointsService(balance = 1000) {
  return {
    getSummaryForUser: jest.fn().mockResolvedValue({
      balance,
      totalReceivedFromKudos: balance,
      totalGivenViaKudos: 0,
      monthlyGivingSpent: 0,
      monthlyGivingRemaining: 200,
      monthlyGivingCap: 200,
      kudosReceivedCount: 1,
      rewardRedemptionsCount: 0,
      uniqueShoutoutSenderCount: 1,
    }),
  };
}

/**
 * Builds a mock transaction manager that simulates the operations inside
 * RewardsService.redeem(). The qb mock exposes an `affectedResult` setter so
 * tests can control whether the stock-decrement query succeeds or fails.
 */
function makeTransactionManager(
  opts: {
    dupRedemption?: Partial<RewardRedemption> | null;
    freshItem?: RewardCatalogItem | null;
    balance?: number;
    stockAffected?: number;
  } = {},
) {
  const {
    dupRedemption = null,
    freshItem = makeItem(),
    balance = 1000,
    stockAffected = 1,
  } = opts;

  const savedRedemption = {
    id: 'rr-uuid-0001',
    status: RewardRedemptionStatus.PENDING,
    pointsSpent: freshItem?.pointsCost ?? 500,
    idempotencyKey: IDEMPOTENCY_KEY,
    rewardItem: freshItem ?? makeItem(),
  };

  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: stockAffected }),
  };

  return {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(dupRedemption) // first call: dup check
      .mockResolvedValueOnce(freshItem), // second call: fresh item lookup
    save: jest
      .fn()
      .mockResolvedValueOnce(savedRedemption) // RewardRedemption save
      .mockResolvedValue({}), // PointLedger save
    create: jest.fn().mockImplementation((_cls, data) => ({ ...data })),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    getSummaryForUser: jest
      .fn()
      .mockResolvedValue({ balance }),
    _qb: qb,
    _saved: savedRedemption,
  };
}

describe('RewardsService', () => {
  let service: RewardsService;
  let catalogRepo: ReturnType<typeof makeCatalogRepo>;
  let redemptionsRepo: ReturnType<typeof makeRedemptionsRepo>;
  let pointsService: ReturnType<typeof makePointsService>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    catalogRepo = makeCatalogRepo();
    redemptionsRepo = makeRedemptionsRepo();
    pointsService = makePointsService();
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: getRepositoryToken(RewardCatalogItem), useValue: catalogRepo },
        { provide: getRepositoryToken(RewardRedemption), useValue: redemptionsRepo },
        { provide: PointsService, useValue: pointsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(RewardsService);
  });

  // ──────────────────────────────────────────────
  // Idempotency — prevents double spending
  // ──────────────────────────────────────────────
  describe('idempotency key deduplication', () => {
    it('returns the existing redemption without entering a transaction', async () => {
      const existing = {
        id: 'rr-uuid-existing',
        status: RewardRedemptionStatus.PENDING,
        pointsSpent: 500,
        idempotencyKey: IDEMPOTENCY_KEY,
        rewardItem: { id: ITEM_ID, title: 'Company Hoodie' },
      } as RewardRedemption;

      redemptionsRepo.findOne.mockResolvedValue(existing);

      const result = await service.redeem(USER_ID, {
        rewardItemId: ITEM_ID,
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      expect(result.id).toBe('rr-uuid-existing');
      expect(result.idempotent).toBe(true);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('idempotent result preserves original status and pointsSpent', async () => {
      const existing = {
        id: 'rr-uuid-existing',
        status: RewardRedemptionStatus.FULFILLED,
        pointsSpent: 1000,
        idempotencyKey: IDEMPOTENCY_KEY,
        rewardItem: { id: ITEM_ID, title: 'Friday Afternoon Off' },
      } as RewardRedemption;

      redemptionsRepo.findOne.mockResolvedValue(existing);

      const result = await service.redeem(USER_ID, {
        rewardItemId: ITEM_ID,
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      expect(result.status).toBe(RewardRedemptionStatus.FULFILLED);
      expect(result.pointsSpent).toBe(1000);
    });

    it('proceeds to transaction when idempotency key is new', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null); // no existing redemption
      catalogRepo.findOne.mockResolvedValue(makeItem());
      // getSummaryForUser already mocked with 1000 balance

      const mgr = makeTransactionManager();
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      await service.redeem(USER_ID, {
        rewardItemId: ITEM_ID,
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────
  // Reward catalog validation
  // ──────────────────────────────────────────────
  describe('reward not found', () => {
    it('throws AppException when reward item does not exist or is inactive', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(null);

      await expect(
        service.redeem(USER_ID, { rewardItemId: ITEM_ID }),
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('out of stock (pre-transaction check)', () => {
    it('throws AppException when stock is 0', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem({ stock: 0 }));

      await expect(
        service.redeem(USER_ID, { rewardItemId: ITEM_ID }),
      ).rejects.toBeInstanceOf(AppException);
    });

    it('does NOT throw out-of-stock when stock is null (unlimited)', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem({ stock: null }));

      const mgr = makeTransactionManager({
        freshItem: makeItem({ stock: null }),
      });
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      const result = await service.redeem(USER_ID, { rewardItemId: ITEM_ID });
      expect(result.idempotent).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Point balance check
  // ──────────────────────────────────────────────
  describe('insufficient balance (pre-transaction check)', () => {
    it('throws AppException when user balance is below pointsCost', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem({ pointsCost: 500 }));
      pointsService.getSummaryForUser.mockResolvedValue({
        balance: 100, // below 500
        totalReceivedFromKudos: 100,
        totalGivenViaKudos: 0,
        monthlyGivingSpent: 0,
        monthlyGivingRemaining: 200,
        monthlyGivingCap: 200,
        kudosReceivedCount: 0,
        rewardRedemptionsCount: 0,
        uniqueShoutoutSenderCount: 0,
      });

      await expect(
        service.redeem(USER_ID, { rewardItemId: ITEM_ID }),
      ).rejects.toBeInstanceOf(AppException);
    });

    it('does NOT throw when balance exactly equals pointsCost', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem({ pointsCost: 500 }));
      pointsService.getSummaryForUser.mockResolvedValue({
        balance: 500, // exactly enough
        totalReceivedFromKudos: 500,
        totalGivenViaKudos: 0,
        monthlyGivingSpent: 0,
        monthlyGivingRemaining: 200,
        monthlyGivingCap: 200,
        kudosReceivedCount: 0,
        rewardRedemptionsCount: 0,
        uniqueShoutoutSenderCount: 0,
      });

      const mgr = makeTransactionManager({ balance: 500 });
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      const result = await service.redeem(USER_ID, { rewardItemId: ITEM_ID });
      expect(result.idempotent).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Successful redemption
  // ──────────────────────────────────────────────
  describe('successful redemption', () => {
    beforeEach(() => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem());
    });

    it('returns a non-idempotent response with correct structure', async () => {
      const mgr = makeTransactionManager();
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      const result = await service.redeem(USER_ID, {
        rewardItemId: ITEM_ID,
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      expect(result.idempotent).toBe(false);
      expect(result.status).toBe(RewardRedemptionStatus.PENDING);
      expect(result.pointsSpent).toBe(500);
    });

    it('saves a PointLedger entry with a negative amount', async () => {
      const mgr = makeTransactionManager();
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      await service.redeem(USER_ID, { rewardItemId: ITEM_ID });

      const ledgerCreate = mgr.create.mock.calls.find(
        ([, data]) => typeof data?.amount === 'number' && data.amount < 0,
      );
      expect(ledgerCreate).toBeDefined();
      expect(ledgerCreate![1].amount).toBe(-500);
    });

    it('decrements stock by 1 via query builder', async () => {
      const mgr = makeTransactionManager();
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      await service.redeem(USER_ID, { rewardItemId: ITEM_ID });

      expect(mgr._qb.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────
  // Concurrent / double-spend protection
  // ──────────────────────────────────────────────
  describe('concurrent redemption (double-spend prevention)', () => {
    it('returns idempotent result when a race produces a dup inside the transaction', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null); // pre-check: no dup
      catalogRepo.findOne.mockResolvedValue(makeItem());

      const dupInsideTransaction = {
        id: 'rr-uuid-dup',
        status: RewardRedemptionStatus.PENDING,
        pointsSpent: 500,
        idempotencyKey: IDEMPOTENCY_KEY,
        rewardItem: { id: ITEM_ID, title: 'Company Hoodie' },
      };

      // Inside the transaction the first findOne finds the dup
      const mgr = makeTransactionManager({
        dupRedemption: dupInsideTransaction as RewardRedemption,
      });
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      const result = await service.redeem(USER_ID, {
        rewardItemId: ITEM_ID,
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      expect(result.id).toBe('rr-uuid-dup');
      expect(result.idempotent).toBe(true);
      // No new save should have been called for a redemption row
      expect(mgr._qb.execute).not.toHaveBeenCalled();
    });

    it('throws out-of-stock when stock-decrement affects 0 rows inside the transaction', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      catalogRepo.findOne.mockResolvedValue(makeItem({ stock: 1 }));

      const mgr = makeTransactionManager({
        freshItem: makeItem({ stock: 1 }),
        stockAffected: 0, // race: stock was already 0 when UPDATE ran
      });
      dataSource.transaction.mockImplementation(
        async (work: Function) => work(mgr),
      );

      await expect(
        service.redeem(USER_ID, { rewardItemId: ITEM_ID }),
      ).rejects.toBeInstanceOf(AppException);
    });
  });
});
