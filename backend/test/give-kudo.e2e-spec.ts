/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
import { Kudo } from '../src/kudos/entities/kudo.entity';
import { KudoRecipient } from '../src/kudos/entities/kudo-recipient.entity';
import { PointLedger } from '../src/kudos/entities/point-ledger.entity';

// Captures OTPs sent during the test so we can complete the OTP verification step.
class FakeEmailService {
  private readonly store = new Map<string, string>();

  sendOtp(to: string, _purpose: string, code: string): void {
    this.store.set(to, code);
  }

  getOtp(email: string): string {
    const code = this.store.get(email);
    if (!code) throw new Error(`No OTP captured for ${email}`);
    return code;
  }
}

const TAG = `e2e-${Date.now()}`;

function makeEmail(role: string) {
  return `${TAG}-${role}@example.com`;
}

const SENDER_EMAIL = makeEmail('sender');
const RECIPIENT_EMAIL = makeEmail('recipient');
const PASSWORD = 'Password123!';

async function registerUser(
  http: App,
  email: string,
  name: string,
  fakeEmail: FakeEmailService,
): Promise<{ accessToken: string; userId: string }> {
  await request(http)
    .post('/auth/register')
    .send({
      email,
      password: PASSWORD,
      fullName: name,
      employeeCode: `EMP-${name.replace(/\s/g, '')}`,
      gender: 'other',
      dateOfBirth: '1990-01-01',
    })
    .expect(201);

  const otp = fakeEmail.getOtp(email);

  const verifyRes = await request(http)
    .post('/auth/register/verify')
    .send({ email, otp })
    .expect(201);

  return {
    accessToken: verifyRes.body.accessToken as string,
    userId: verifyRes.body.user?.id as string,
  };
}

describe('Give Kudo — e2e integration', () => {
  let app: INestApplication<App>;
  let http: App;
  let dataSource: DataSource;
  let fakeEmail: FakeEmailService;

  let senderToken: string;
  let recipientUserId: string;
  let coreValueId: string;
  let createdKudoId: string;

  beforeAll(async () => {
    fakeEmail = new FakeEmailService();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(fakeEmail)
      // Disable rate limiting so rapid requests during the test don't get blocked.
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    http = app.getHttpServer() as App;
    dataSource = module.get(DataSource);

    // Ensure all migrations have run (idempotent — skips already-applied ones).
    await dataSource.runMigrations();

    // Register two users: sender and recipient.
    const sender = await registerUser(http, SENDER_EMAIL, 'E2E Sender', fakeEmail);
    senderToken = sender.accessToken;

    const recipient = await registerUser(http, RECIPIENT_EMAIL, 'E2E Recipient', fakeEmail);
    recipientUserId = recipient.userId;
  });

  afterAll(async () => {
    // Clean up test data by deleting the test users (cascade deletes their kudos/ledger).
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM users WHERE email LIKE $1`,
        [`${TAG}%`],
      );
    }
    await app?.close();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 1 — Fetch core values (seeded by migration)
  // ─────────────────────────────────────────────────────────────────
  it('GET /kudos/core-values returns at least one active core value', async () => {
    const res = await request(http)
      .get('/kudos/core-values')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    coreValueId = res.body[0].id as string;
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 2 — Create kudo: sender → recipient (10 pts)
  // ─────────────────────────────────────────────────────────────────
  it('POST /kudos creates a kudo and returns 201 with correct shape', async () => {
    const res = await request(http)
      .post('/kudos')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        coreValueId,
        description: 'Great teamwork on the e2e test sprint!',
        recipients: [{ userId: recipientUserId, points: 10 }],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.description).toBe('Great teamwork on the e2e test sprint!');
    expect(res.body.status).toBe('ready');
    expect(res.body.recipients).toHaveLength(1);
    expect(res.body.recipients[0].points).toBe(10);

    createdKudoId = res.body.id as string;
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 3 — DB verification: kudo row persisted
  // ─────────────────────────────────────────────────────────────────
  it('kudo row exists in DB with correct description and status', async () => {
    const kudo = await dataSource
      .getRepository(Kudo)
      .findOne({ where: { id: createdKudoId } });

    expect(kudo).not.toBeNull();
    expect(kudo!.description).toBe('Great teamwork on the e2e test sprint!');
    expect(kudo!.status).toBe('ready');
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 4 — DB verification: recipient row with correct points
  // ─────────────────────────────────────────────────────────────────
  it('kudo_recipient row exists with userId and points = 10', async () => {
    const row = await dataSource
      .getRepository(KudoRecipient)
      .findOne({ where: { kudoId: createdKudoId, userId: recipientUserId } });

    expect(row).not.toBeNull();
    expect(row!.points).toBe(10);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 5 — DB verification: point ledger double-entry (sum = 0)
  // ─────────────────────────────────────────────────────────────────
  it('point_ledger has a KUDO_GIVEN (-10) and KUDO_RECEIVED (+10) entry', async () => {
    const entries = await dataSource
      .getRepository(PointLedger)
      .find({ where: { kudoId: createdKudoId } });

    expect(entries.length).toBeGreaterThanOrEqual(2);

    const sum = entries.reduce((acc, e) => acc + e.amount, 0);
    expect(sum).toBe(0); // double-entry must balance to zero

    const given = entries.find((e) => e.entryType === 'kudo_given');
    const received = entries.find((e) => e.entryType === 'kudo_received');

    expect(given).toBeDefined();
    expect(given!.amount).toBe(-10);
    expect(received).toBeDefined();
    expect(received!.amount).toBe(10);
  });

  // ─────────────────────────────────────────────────────────────────
  // Edge case — self-give must be rejected
  // ─────────────────────────────────────────────────────────────────
  it('POST /kudos rejects self-give with 400', async () => {
    // Re-fetch sender userId from the token by calling /users/me or similar.
    // We'll derive it from another approach: register with a known email and check.
    // Simplest: send kudo to own user by using the same token; the backend derives senderId from JWT.
    // We need senderUserId — get it from POST /auth/register/verify body (already captured above).
    // Re-register a fresh user to get their id cleanly.
    const selfEmail = makeEmail('self');
    const self = await registerUser(http, selfEmail, 'E2E Self', fakeEmail);

    const res = await request(http)
      .post('/kudos')
      .set('Authorization', `Bearer ${self.accessToken}`)
      .send({
        coreValueId,
        description: 'Trying to give to myself',
        recipients: [{ userId: self.userId, points: 10 }],
      })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/chính mình/i);
  });
});
