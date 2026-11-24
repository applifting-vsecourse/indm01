import { AppModule } from '@/app.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { User, UserRole } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as request from 'supertest';

export interface IntegrationTestContext {
  app: INestApplication;
  prisma: PrismaService;
  auth: BetterAuth;
}

export async function createIntegrationApp(): Promise<IntegrationTestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());

  const appInstance = app.getHttpAdapter().getInstance();
  const auth = app.get<BetterAuth>('BetterAuth');
  appInstance.all('/api/auth/*splat', toNodeHandler(auth));
  appInstance.use(express.json());

  app.setGlobalPrefix('api');
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma, auth };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const tableNames = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}

export interface SignedInUser {
  user: User;
  cookie: string;
}

export async function createSignedInUser(
  ctx: IntegrationTestContext,
  overrides: Partial<{
    email: string;
    password: string;
    name: string;
    username: string;
    role: UserRole;
  }> = {},
): Promise<SignedInUser> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = overrides.email ?? `user-${suffix}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? `Test User ${suffix}`;
  const username = overrides.username ?? `user_${suffix.replace(/-/g, '_')}`;

  const signUpRes = await request(ctx.app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .send({ email, password, name })
    .expect(200);

  const setCookie = signUpRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c: string) => c.split(';')[0]).join('; ')
    : typeof setCookie === 'string'
      ? setCookie.split(';')[0]
      : '';

  if (!cookieHeader) {
    throw new Error('Sign-up did not return a session cookie');
  }

  const user = await ctx.prisma.user.update({
    where: { email },
    data: {
      username,
      ...(overrides.role ? { role: overrides.role } : {}),
    },
  });

  return { user, cookie: cookieHeader };
}
