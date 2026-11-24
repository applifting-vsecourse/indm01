import * as request from 'supertest';
import {
  cleanDatabase,
  createIntegrationApp,
  createSignedInUser,
  IntegrationTestContext,
} from './integration-app';

describe('Quacks API (integration)', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationApp();
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /api/quacks returns 401 when signed out', async () => {
    await request(ctx.app.getHttpServer()).get('/api/quacks').expect(401);
  });

  it('GET /api/quacks returns 200 when signed in', async () => {
    const { cookie } = await createSignedInUser(ctx);

    const response = await request(ctx.app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
