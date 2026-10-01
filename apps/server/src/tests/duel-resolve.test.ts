import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ProgrammingLanguage } from '@prisma/client';
import { createApp } from '../app/create-app.js';
import { prisma } from '../shared/lib/prisma.js';
import { pickDuelWinner, resolveDuel } from '../modules/duels/duel-resolve.js';

interface TokenUser {
  accessToken: string;
  user: { id: string };
}

function body(res: { body: unknown }): { data: TokenUser } {
  return res.body as { data: TokenUser };
}

const app = createApp();
const password = 'Test123456!';
const stamp = Date.now();
const emails = [`duelres_a_${String(stamp)}@example.com`, `duelres_b_${String(stamp)}@example.com`];

async function register(index: number): Promise<TokenUser> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: emails[index],
      username: `duelres_${String(index)}_${String(stamp).slice(-8)}`,
      password,
    });
  expect(res.status).toBe(201);
  return body(res).data;
}

describe('pickDuelWinner (pure tie-break rules)', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');
  const candidate = (userId: string, score: number, finishedAt: Date) => ({
    userId,
    score,
    completedAt: finishedAt,
    submittedAt: at,
  });

  it('prefers the higher score regardless of order', () => {
    expect(pickDuelWinner(candidate('a', 90, at), candidate('b', 80, at))).toBe('a');
    expect(pickDuelWinner(candidate('a', 80, at), candidate('b', 90, at))).toBe('b');
  });

  it('breaks a score tie by earliest finish', () => {
    const slower = candidate('a', 90, new Date(at.getTime() + 1_000));
    const faster = candidate('b', 90, at);
    expect(pickDuelWinner(slower, faster)).toBe('b');
    expect(pickDuelWinner(faster, slower)).toBe('b');
  });

  it('returns null for an exact tie', () => {
    expect(pickDuelWinner(candidate('a', 90, at), candidate('b', 90, at))).toBeNull();
  });
});

describe('resolveDuel (score decides, not first-accepted)', () => {
  let creator: TokenUser;
  let opponent: TokenUser;
  let challengeId = '';
  let duelId = '';

  beforeAll(async () => {
    [creator, opponent] = await Promise.all([register(0), register(1)]);
    const challenge = await prisma.challenge.create({
      data: {
        slug: `duel-resolve-${String(stamp)}`,
        title: 'Duel resolve challenge',
        statement: 'Print a value.',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        supportedLanguages: [ProgrammingLanguage.PYTHON],
        isPublished: true,
      },
    });
    challengeId = challenge.id;
    const duel = await prisma.duelMatch.create({
      data: {
        challengeId,
        creatorId: creator.user.id,
        opponentId: opponent.user.id,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
    duelId = duel.id;
  });

  afterAll(async () => {
    if (duelId) await prisma.duelMatch.delete({ where: { id: duelId } }).catch(() => undefined);
    if (challengeId)
      await prisma.challenge.delete({ where: { id: challengeId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { in: emails } } }).catch(() => undefined);
  });

  it('stays ACTIVE until both players have an accepted submission', async () => {
    await prisma.submission.create({
      data: {
        userId: creator.user.id,
        challengeId,
        language: ProgrammingLanguage.PYTHON,
        sourceCode: 'print(1)',
        status: 'ACCEPTED',
        score: 50,
        completedAt: new Date(),
        duelId,
      },
    });
    const resolution = await resolveDuel(duelId);
    expect(resolution?.resolved).toBe(false);
    const duel = await prisma.duelMatch.findUnique({ where: { id: duelId } });
    expect(duel?.status).toBe('ACTIVE');
  });

  it('awards the higher score once the opponent finishes', async () => {
    await prisma.submission.create({
      data: {
        userId: opponent.user.id,
        challengeId,
        language: ProgrammingLanguage.PYTHON,
        sourceCode: 'print(2)',
        status: 'ACCEPTED',
        score: 40,
        completedAt: new Date(),
        duelId,
      },
    });
    const resolution = await resolveDuel(duelId);
    expect(resolution?.resolved).toBe(true);
    expect(resolution?.winnerId).toBe(creator.user.id);
    const duel = await prisma.duelMatch.findUnique({ where: { id: duelId } });
    expect(duel?.status).toBe('COMPLETED');
    expect(duel?.winnerId).toBe(creator.user.id);
  });

  it('is idempotent once the duel is completed', async () => {
    const second = await resolveDuel(duelId);
    expect(second?.resolved).toBe(false);
    expect(second?.winnerId).toBe(creator.user.id);
  });
});
