import * as request from 'supertest';
import {
  cleanDatabase,
  createIntegrationApp,
  createSignedInUser,
  IntegrationTestContext,
} from './integration-app';

describe('Quack Likes API (integration)', () => {
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

  const createQuack = async (
    cookie: string,
    text: string,
    parentId?: string,
  ): Promise<{ id: string }> => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/quacks')
      .set('Cookie', cookie)
      .send(parentId ? { text, parentId } : { text })
      .expect(201);
    return res.body as { id: string };
  };

  it('A1: signed-out visitors receive 401 on like, unlike, and list likers', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/quacks/any-id/like')
      .expect(401);
    await request(ctx.app.getHttpServer())
      .delete('/api/quacks/any-id/like')
      .expect(401);
    await request(ctx.app.getHttpServer())
      .get('/api/quacks/any-id/likes')
      .expect(401);
  });

  it('A2: GET /api/quacks returns likeCount=0 and likedByMe=false initially', async () => {
    const userA = await createSignedInUser(ctx);
    const quack = await createQuack(userA.cookie, 'Hello pond');

    const res = await request(ctx.app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', userA.cookie)
      .expect(200);

    const found = (
      res.body as Array<{ id: string; likeCount: number; likedByMe: boolean }>
    ).find((q) => q.id === quack.id);
    expect(found).toBeDefined();
    expect(found?.likeCount).toBe(0);
    expect(found?.likedByMe).toBe(false);
  });

  it('A3: liking persists and likedByMe is scoped per user', async () => {
    const userA = await createSignedInUser(ctx);
    const userB = await createSignedInUser(ctx);
    const quack = await createQuack(userB.cookie, 'Quack from B');

    const likeRes = await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(likeRes.body).toEqual({ likeCount: 1, likedByMe: true });

    const feedForA = await request(ctx.app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(feedForA.body[0]).toMatchObject({
      id: quack.id,
      likeCount: 1,
      likedByMe: true,
    });

    const feedForB = await request(ctx.app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', userB.cookie)
      .expect(200);
    expect(feedForB.body[0]).toMatchObject({
      id: quack.id,
      likeCount: 1,
      likedByMe: false,
    });
  });

  it('A4: repeated like by the same user is idempotent', async () => {
    const userA = await createSignedInUser(ctx);
    const quack = await createQuack(userA.cookie, 'Only once');

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);

    const second = await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);

    expect(second.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('A5: multiple users liking the same quack increments likeCount independently', async () => {
    const userA = await createSignedInUser(ctx);
    const userB = await createSignedInUser(ctx);
    const quack = await createQuack(userA.cookie, 'Popular quack');

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);

    const resB = await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(200);

    expect(resB.body).toEqual({ likeCount: 2, likedByMe: true });
  });

  it('A6: unlike decrements count and repeated unlike is idempotent', async () => {
    const userA = await createSignedInUser(ctx);
    const userB = await createSignedInUser(ctx);
    const quack = await createQuack(userA.cookie, 'Unlike me');

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(200);

    const firstUnlike = await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(firstUnlike.body).toEqual({ likeCount: 1, likedByMe: false });

    const secondUnlike = await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(secondUnlike.body).toEqual({ likeCount: 1, likedByMe: false });
  });

  it('A7: author can like their own quack', async () => {
    const author = await createSignedInUser(ctx);
    const quack = await createQuack(author.cookie, 'Self like');

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', author.cookie)
      .expect(200);

    expect(res.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('A8: replies support likes and expose likeCount and likedByMe', async () => {
    const userA = await createSignedInUser(ctx);
    const userB = await createSignedInUser(ctx);
    const parent = await createQuack(userA.cookie, 'Parent quack');
    const reply = await createQuack(userB.cookie, 'Nice reply', parent.id);

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${reply.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);

    const repliesAfterLike = await request(ctx.app.getHttpServer())
      .get(`/api/quacks/${parent.id}/replies`)
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(repliesAfterLike.body[0]).toMatchObject({
      id: reply.id,
      likeCount: 1,
      likedByMe: true,
    });

    await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${reply.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);

    const repliesAfterUnlike = await request(ctx.app.getHttpServer())
      .get(`/api/quacks/${parent.id}/replies`)
      .set('Cookie', userA.cookie)
      .expect(200);
    expect(repliesAfterUnlike.body[0]).toMatchObject({
      id: reply.id,
      likeCount: 0,
      likedByMe: false,
    });
  });

  it('A9: GET /api/quacks/:id/likes returns likers most recent first and updates on unlike', async () => {
    const userA = await createSignedInUser(ctx, {
      name: 'Alice Duck',
      username: 'aliceduck',
    });
    const userB = await createSignedInUser(ctx, {
      name: 'Bob Duck',
      username: 'bobduck',
    });
    const quack = await createQuack(userA.cookie, 'Who liked this?');

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userA.cookie)
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(200);

    const likersRes = await request(ctx.app.getHttpServer())
      .get(`/api/quacks/${quack.id}/likes`)
      .set('Cookie', userA.cookie)
      .expect(200);

    expect(likersRes.body).toEqual([
      { id: userB.user.id, name: 'Bob Duck', username: 'bobduck' },
      { id: userA.user.id, name: 'Alice Duck', username: 'aliceduck' },
    ]);

    await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${quack.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(200);

    const likersAfterUnlike = await request(ctx.app.getHttpServer())
      .get(`/api/quacks/${quack.id}/likes`)
      .set('Cookie', userA.cookie)
      .expect(200);

    expect(likersAfterUnlike.body).toEqual([
      { id: userA.user.id, name: 'Alice Duck', username: 'aliceduck' },
    ]);
  });

  it('A10: missing quack and deleted tombstone return 404, and tombstone clears likes', async () => {
    const userA = await createSignedInUser(ctx);
    const userB = await createSignedInUser(ctx);

    await request(ctx.app.getHttpServer())
      .post('/api/quacks/non-existent-id/like')
      .set('Cookie', userA.cookie)
      .expect(404);
    await request(ctx.app.getHttpServer())
      .delete('/api/quacks/non-existent-id/like')
      .set('Cookie', userA.cookie)
      .expect(404);
    await request(ctx.app.getHttpServer())
      .get('/api/quacks/non-existent-id/likes')
      .set('Cookie', userA.cookie)
      .expect(404);

    // Create parent with a reply and a like, then delete parent -> tombstone
    const parent = await createQuack(userA.cookie, 'Will become tombstone');
    await createQuack(userB.cookie, 'Keeping thread alive', parent.id);
    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${parent.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(200);

    await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${parent.id}`)
      .set('Cookie', userA.cookie)
      .expect(204);

    await request(ctx.app.getHttpServer())
      .post(`/api/quacks/${parent.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(404);
    await request(ctx.app.getHttpServer())
      .delete(`/api/quacks/${parent.id}/like`)
      .set('Cookie', userB.cookie)
      .expect(404);
    await request(ctx.app.getHttpServer())
      .get(`/api/quacks/${parent.id}/likes`)
      .set('Cookie', userB.cookie)
      .expect(404);

    const feed = await request(ctx.app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', userB.cookie)
      .expect(200);
    const tombstone = (
      feed.body as Array<{ id: string; likeCount: number; likedByMe: boolean }>
    ).find((q) => q.id === parent.id);
    expect(tombstone).toMatchObject({
      id: parent.id,
      likeCount: 0,
      likedByMe: false,
    });
  });
});
