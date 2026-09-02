import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ProgrammingLanguage } from '@prisma/client';
import { createApp } from '../app/create-app.js';
import { prisma } from '../shared/lib/prisma.js';

interface ApiBody<T = Record<string, unknown>> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

function body<T>(res: { body: unknown }): ApiBody<T> {
  return res.body as ApiBody<T>;
}

interface TokenUser {
  accessToken: string;
  user: { id: string };
}

const app = createApp();
const password = 'Test123456!';
const stamp = Date.now();
const emails = [
  `duel_a_${String(stamp)}@example.com`,
  `duel_b_${String(stamp)}@example.com`,
  `duel_c_${String(stamp)}@example.com`,
];
const usernames = [
  `duel_a_${String(stamp).slice(-8)}`,
  `duel_b_${String(stamp).slice(-8)}`,
  `duel_c_${String(stamp).slice(-8)}`,
];
const auth = (token: string) => `Bearer ${token}`;

async function register(index: number): Promise<TokenUser> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: emails[index], username: usernames[index], password });
  expect(res.status).toBe(201);
  return body<TokenUser>(res).data;
}

describe('Duel lobby and submissions', () => {
  let first: TokenUser;
  let second: TokenUser;
  let third: TokenUser;
  let challengeId = '';
  let duelId = '';

  beforeAll(async () => {
    [first, second, third] = await Promise.all([register(0), register(1), register(2)]);
    const challenge = await prisma.challenge.create({
      data: {
        slug: `duel-test-${String(stamp)}`,
        title: 'Duel test challenge',
        statement: 'Print a value.',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        supportedLanguages: [ProgrammingLanguage.PYTHON],
        isPublished: true,
      },
    });
    challengeId = challenge.id;
  });

  afterAll(async () => {
    if (duelId) await prisma.duelMatch.delete({ where: { id: duelId } }).catch(() => undefined);
    if (challengeId)
      await prisma.challenge.delete({ where: { id: challengeId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { in: emails } } }).catch(() => undefined);
  });

  it('creates and lists an open duel', async () => {
    const created = await request(app)
      .post('/api/v1/duels')
      .set('Authorization', auth(first.accessToken))
      .send({ challengeId });
    expect(created.status).toBe(201);
    duelId = body<{ duel: { id: string; status: string } }>(created).data.duel.id;
    expect(body<{ duel: { status: string } }>(created).data.duel.status).toBe('OPEN');

    const listed = await request(app)
      .get('/api/v1/duels')
      .set('Authorization', auth(second.accessToken));
    expect(listed.status).toBe(200);
    expect(
      body<{ duels: Array<{ id: string }> }>(listed).data.duels.some((duel) => duel.id === duelId),
    ).toBe(true);
  });

  it('joins the duel and blocks non-participants', async () => {
    const joined = await request(app)
      .post(`/api/v1/duels/${duelId}/join`)
      .set('Authorization', auth(second.accessToken));
    expect(joined.status).toBe(200);
    expect(
      body<{ duel: { status: string; opponent: { id: string } } }>(joined).data.duel,
    ).toMatchObject({
      status: 'ACTIVE',
      opponent: { id: second.user.id },
    });

    const hidden = await request(app)
      .get(`/api/v1/duels/${duelId}`)
      .set('Authorization', auth(third.accessToken));
    expect(hidden.status).toBe(404);
  });

  it('accepts a submission from a duel participant', async () => {
    const submitted = await request(app)
      .post(`/api/v1/duels/${duelId}/submissions`)
      .set('Authorization', auth(first.accessToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(submitted.status).toBe(202);
    expect(body<{ submission: { duelId: string } }>(submitted).data.submission.duelId).toBe(duelId);
  });
});
