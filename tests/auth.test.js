import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';

beforeAll(async () => {
  // Wake up the database before any test's clock starts ticking
  await prisma.$queryRaw`SELECT 1`;
}, 15000); // give this one extra time too

describe('Auth API', () => {
  // Generate a fresh, unique user for each test file run so signup never collides
  // with leftover data from a previous run (see earlier discussion on @unique email).
  const uniqueEmail = () => `test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

  describe('POST /api/auth/signup', () => {
    it('creates a new user and returns tokens', async () => {
      const email = uniqueEmail();
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Ama Owusu',
        email,
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.name).toBe('Ama Owusu');
    });

    it('rejects signup with a missing name', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: uniqueEmail(),
        password: 'password123',
      });
      expect(res.status).toBe(400);
    });

    it('rejects signup with an invalid email format', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'password123',
      });
      expect(res.status).toBe(400);
    });

    it('rejects signup with a password under 8 characters', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Short Pass',
        email: uniqueEmail(),
        password: '123',
      });
      expect(res.status).toBe(400);
    });

    it('rejects signup with a duplicate email', async () => {
      const email = uniqueEmail();
      const payload = { name: 'Dupe Test', email, password: 'password123' };

      const first = await request(app).post('/api/auth/signup').send(payload);
      expect(first.status).toBe(201);

      const second = await request(app).post('/api/auth/signup').send(payload);
      expect(second.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const email = uniqueEmail();
      const password = 'password123';

      await request(app).post('/api/auth/signup').send({ name: 'Login Test', email, password });

      const res = await request(app).post('/api/auth/login').send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(email);
    });

    it('rejects login with the wrong password', async () => {
      const email = uniqueEmail();
      await request(app).post('/api/auth/signup').send({
        name: 'Wrong Pass',
        email,
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/login').send({
        email,
        password: 'totallyWrongPassword',
      });

      expect(res.status).toBe(401);
    });

    it('rejects login for an email that was never signed up', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: uniqueEmail(),
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });

    it('rejects login with a missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: uniqueEmail(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns a new access token given a valid refresh token', async () => {
      const email = uniqueEmail();
      const signupRes = await request(app).post('/api/auth/signup').send({
        name: 'Refresh Test',
        email,
        password: 'password123',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: signupRes.body.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects a missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(401);
    });

    it('rejects an invalid/garbage refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'this.is.not.a.real.token' });
      expect(res.status).toBe(401);
    });
  });
});