import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';

beforeAll(async () => {
  // Wake up the database before any test's clock starts ticking
  await prisma.$queryRaw`SELECT 1`;
}, 15000); // give this one extra time too

const uniqueEmail = () => `wallet-test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

// Helper: sign up a fresh user and return their access token + email
async function createTestUser() {
  const email = uniqueEmail();
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Wallet Test User',
    email,
    password: 'password123',
  });
  return { token: res.body.accessToken, email };
}

describe('Wallet API', () => {
  describe('GET /api/wallet', () => {
    it('rejects requests with no auth token', async () => {
      const res = await request(app).get('/api/wallet');
      expect(res.status).toBe(401);
    });

    it('returns a zero balance for a newly created wallet', async () => {
      const { token } = await createTestUser();
      const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Number(res.body.balance)).toBe(0);
      expect(res.body.currency).toBe('GHS');
    });
  });

  describe('POST /api/wallet/topup', () => {
    it('increases the balance and creates a transaction record', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 });

      expect(res.status).toBe(201);
      expect(Number(res.body.wallet.balance)).toBe(100);
      expect(res.body.transaction.type).toBe('topup');
      expect(Number(res.body.transaction.amount)).toBe(100);
    });

    it('rejects a zero or negative amount', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -50 });

      expect(res.status).toBe(400);
    });

    it('rejects a missing amount', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('accumulates balance correctly across multiple topups', async () => {
      const { token } = await createTestUser();

      await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${token}`).send({ amount: 50 });
      const res = await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 25 });

      expect(Number(res.body.wallet.balance)).toBe(75);
    });
  });

  describe('POST /api/wallet/send', () => {
    it('transfers money and updates both wallets correctly', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${sender.token}`).send({ amount: 200 });

      const sendRes = await request(app)
        .post('/api/wallet/send')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ recipientEmail: recipient.email, amount: 75 });

      expect(sendRes.status).toBe(201);
      expect(Number(sendRes.body.wallet.balance)).toBe(125);

      const recipientWalletRes = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${recipient.token}`);

      expect(Number(recipientWalletRes.body.balance)).toBe(75);
    });

    it('creates matching send/receive transaction records for both parties', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${sender.token}`).send({ amount: 100 });
      await request(app)
        .post('/api/wallet/send')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ recipientEmail: recipient.email, amount: 40 });

      const senderTx = await request(app).get('/api/transaction').set('Authorization', `Bearer ${sender.token}`);
      const recipientTx = await request(app).get('/api/transaction').set('Authorization', `Bearer ${recipient.token}`);

      const senderSend = senderTx.body.data.find((t) => t.type === 'send');
      const recipientReceive = recipientTx.body.data.find((t) => t.type === 'receive');

      expect(senderSend).toBeDefined();
      expect(Number(senderSend.amount)).toBe(40);
      expect(recipientReceive).toBeDefined();
      expect(Number(recipientReceive.amount)).toBe(40);
    });

    it('rejects a transfer larger than the sender balance', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const res = await request(app)
        .post('/api/wallet/send')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ recipientEmail: recipient.email, amount: 50 });

      expect(res.status).toBe(400);
    });

    it('rejects a transfer to a nonexistent recipient', async () => {
      const sender = await createTestUser();
      await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${sender.token}`).send({ amount: 100 });

      const res = await request(app)
        .post('/api/wallet/send')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ recipientEmail: uniqueEmail(), amount: 10 });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid amount', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const res = await request(app)
        .post('/api/wallet/send')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ recipientEmail: recipient.email, amount: -5 });

      expect(res.status).toBe(400);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});