import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app/create-app.js';
import { prisma } from '../shared/lib/prisma.js';

interface ApiBody<T = Record<string, unknown>> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

function body<T = Record<string, unknown>>(res: { body: unknown }): ApiBody<T> {
  return res.body as ApiBody<T>;
}

interface TokenUser {
  accessToken: string;
  user: { id: string; email: string; role: string };
}

const app = createApp();
const password = 'Test123456!';
const stamp = Date.now();
const adminEmail = `adm_${String(stamp)}@example.com`;
const adminUsername = `adm_${String(stamp).slice(-6)}`;
const playerEmail = `plr_${String(stamp)}@example.com`;
const playerUsername = `plr_${String(stamp).slice(-6)}`;
const secondEmail = `plr2_${String(stamp)}@example.com`;
const secondUsername = `plr2_${String(stamp).slice(-6)}`;

async function register(email: string, username: string): Promise<TokenUser> {
  const res = await request(app).post('/api/v1/auth/register').send({ email, username, password });
  expect(res.status).toBe(201);
  return body<TokenUser>(res).data;
}

describe('Challenge system repair — admin CRUD + security + runs', () => {
  let adminToken = '';
  let adminId = '';
  let playerToken = '';
  let playerId = '';
  let secondToken = '';
  let challengeId = '';
  let slug = '';
  const visibleTestIds: string[] = [];
  const hiddenTestIds: string[] = [];
  const hintIds: string[] = [];
  let submissionId = '';

  beforeAll(async () => {
    const admin = await register(adminEmail, adminUsername);
    const player = await register(playerEmail, playerUsername);
    const second = await register(secondEmail, secondUsername);
    adminId = admin.user.id;
    playerId = player.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    // The role is carried by JWT claims, so a fresh login is required after promotion.
    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password });
    expect(relogin.status).toBe(200);
    adminToken = body<TokenUser>(relogin).data.accessToken;
    playerToken = player.accessToken;
    secondToken = second.accessToken;
  });

  afterAll(async () => {
    if (challengeId) {
      await prisma.challenge.delete({ where: { id: challengeId } }).catch(() => undefined);
    }
    await prisma.user
      .deleteMany({ where: { email: { in: [adminEmail, playerEmail, secondEmail] } } })
      .catch(() => undefined);
  });

  const auth = (token: string) => `Bearer ${token}`;

  it('admin creates a challenge', async () => {
    const res = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', auth(adminToken))
      .send({
        slug: `tc-${String(stamp)}`,
        title: `Challenge ${String(stamp)}`,
        statement: 'Read two integers and print their sum.',
        constraints: '1 ≤ a, b ≤ 10^9',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        tags: ['test'],
        supportedLanguages: ['PYTHON'],
        xpReward: 100,
        timeLimitMs: 2000,
        memoryLimitMb: 128,
      });
    expect(res.status).toBe(201);
    challengeId = body<{ challenge: { id: string; slug: string } }>(res).data.challenge.id;
    slug = body<{ challenge: { id: string; slug: string } }>(res).data.challenge.slug;
  });

  it('admin adds visible and hidden test cases', async () => {
    const cases = [
      { input: '2\n3\n', expectedOutput: '5\n', isHidden: false, weight: 1, sortOrder: 0 },
      {
        input: '10\n5\n',
        expectedOutput: '15\n',
        isHidden: false,
        weight: 1,
        sortOrder: 1,
        explanation: 'Sum of 10 and 5',
      },
      { input: '-2\n-3\n', expectedOutput: '-5\n', isHidden: false, weight: 1, sortOrder: 2 },
      {
        input: '1000000000\n1\n',
        expectedOutput: '1000000001\n',
        isHidden: true,
        weight: 2,
        sortOrder: 3,
      },
      {
        input: 'HIDDENINPUT_SECRET_A\n',
        expectedOutput: 'HIDDENOUTPUT_SECRET_A\n',
        isHidden: true,
        weight: 2,
        sortOrder: 4,
      },
      {
        input: 'HIDDENINPUT_SECRET_B\n',
        expectedOutput: 'HIDDENOUTPUT_SECRET_B\n',
        isHidden: true,
        weight: 2,
        sortOrder: 5,
      },
    ];
    for (const testCase of cases) {
      const res = await request(app)
        .post(`/api/v1/admin/challenges/${challengeId}/test-cases`)
        .set('Authorization', auth(adminToken))
        .send(testCase);
      expect(res.status).toBe(201);
      const created = body<{ testCase: { id: string; isHidden: boolean } }>(res).data.testCase;
      (created.isHidden ? hiddenTestIds : visibleTestIds).push(created.id);
    }
    expect(visibleTestIds).toHaveLength(3);
    expect(hiddenTestIds).toHaveLength(3);
  });

  it('admin adds hints with XP penalties', async () => {
    const hints = [
      { level: 1, content: 'HINT_ONE_SECRET: add the two numbers.', xpPenalty: 10 },
      { level: 2, content: 'HINT_TWO_SECRET: numbers may be negative.', xpPenalty: 20 },
      { level: 3, content: 'HINT_THREE_SECRET: use a 64-bit integer.', xpPenalty: 30 },
    ];
    for (const hint of hints) {
      const res = await request(app)
        .post(`/api/v1/admin/challenges/${challengeId}/hints`)
        .set('Authorization', auth(adminToken))
        .send(hint);
      expect(res.status).toBe(201);
      hintIds.push(body<{ hint: { id: string } }>(res).data.hint.id);
    }
    expect(hintIds).toHaveLength(3);
  });

  it('admin can update and delete a test case and a hint', async () => {
    const extraTc = await request(app)
      .post(`/api/v1/admin/challenges/${challengeId}/test-cases`)
      .set('Authorization', auth(adminToken))
      .send({ input: '7\n8\n', expectedOutput: '15\n', isHidden: false, weight: 1, sortOrder: 99 });
    const extraTcId = body<{ testCase: { id: string } }>(extraTc).data.testCase.id;

    const updatedTc = await request(app)
      .patch(`/api/v1/admin/challenges/${challengeId}/test-cases/${extraTcId}`)
      .set('Authorization', auth(adminToken))
      .send({ isHidden: true, weight: 5 });
    expect(updatedTc.status).toBe(200);
    expect(
      body<{ testCase: { isHidden: boolean; weight: number } }>(updatedTc).data.testCase,
    ).toMatchObject({
      isHidden: true,
      weight: 5,
    });

    const delTc = await request(app)
      .delete(`/api/v1/admin/challenges/${challengeId}/test-cases/${extraTcId}`)
      .set('Authorization', auth(adminToken));
    expect(delTc.status).toBe(200);

    const extraHint = await request(app)
      .post(`/api/v1/admin/challenges/${challengeId}/hints`)
      .set('Authorization', auth(adminToken))
      .send({ level: 4, content: 'HINT_FOUR_SECRET: read with split().', xpPenalty: 40 });
    const extraHintId = body<{ hint: { id: string } }>(extraHint).data.hint.id;
    const delHint = await request(app)
      .delete(`/api/v1/admin/challenges/${challengeId}/hints/${extraHintId}`)
      .set('Authorization', auth(adminToken));
    expect(delHint.status).toBe(200);
  });

  it('publishes the challenge', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/challenges/${challengeId}/publish`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  it('admin view returns all test cases and hints', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    const challenge = body<{ challenge: { testCases: unknown[]; hints: unknown[] } }>(res).data
      .challenge;
    expect(challenge.testCases).toHaveLength(6);
    expect(challenge.hints).toHaveLength(3);
  });

  it('public view hides hidden test cases and hint contents', async () => {
    const res = await request(app).get(`/api/v1/challenges/${slug}`);
    expect(res.status).toBe(200);
    const data = body<{
      challenge: {
        testCases: Array<{ id: string; isHidden?: boolean }>;
        hints: Array<{ level: number; xpPenalty: number; content?: string }>;
      };
    }>(res).data;
    expect(data.challenge.testCases).toHaveLength(3);
    for (const testCase of data.challenge.testCases) {
      expect(testCase.isHidden).toBeUndefined();
      expect(hiddenTestIds).not.toContain(testCase.id);
    }
    expect(data.challenge.hints).toHaveLength(3);
    for (const hint of data.challenge.hints) {
      expect(hint.content).toBeUndefined();
    }
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain('HIDDENINPUT_SECRET_A');
    expect(serialized).not.toContain('HIDDENOUTPUT_SECRET_B');
    expect(serialized).not.toContain('HINT_ONE_SECRET');
    expect(serialized).not.toContain('HINT_THREE_SECRET');
  });

  it('PLAYER cannot access admin challenge endpoints', async () => {
    const create = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', auth(playerToken))
      .send({
        slug: 'blocked',
        title: 'Blocked',
        statement: 'Should be blocked',
        difficulty: 'EASY',
        type: 'ALGORITHMS',
        supportedLanguages: ['PYTHON'],
      });
    expect(create.status).toBe(403);

    const addTc = await request(app)
      .post(`/api/v1/admin/challenges/${challengeId}/test-cases`)
      .set('Authorization', auth(playerToken))
      .send({ input: '1\n', expectedOutput: '1\n' });
    expect(addTc.status).toBe(403);

    const addHint = await request(app)
      .post(`/api/v1/admin/challenges/${challengeId}/hints`)
      .set('Authorization', auth(playerToken))
      .send({ level: 1, content: 'nope' });
    expect(addHint.status).toBe(403);

    const list = await request(app)
      .get(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', auth(playerToken));
    expect(list.status).toBe(403);
  });

  it('hint reveal records the reveal exactly once and charges once', async () => {
    const missingAuth = await request(app).get(`/api/v1/challenges/${slug}/hints/1`);
    expect(missingAuth.status).toBe(401);

    const unknown = await request(app)
      .get(`/api/v1/challenges/${slug}/hints/99`)
      .set('Authorization', auth(playerToken));
    expect(unknown.status).toBe(404);

    const first = await request(app)
      .get(`/api/v1/challenges/${slug}/hints/1`)
      .set('Authorization', auth(playerToken));
    expect(first.status).toBe(200);
    expect(
      body<{ hint: { content: string; xpPenalty: number; alreadyRevealed: boolean } }>(first).data
        .hint,
    ).toMatchObject({
      content: 'HINT_ONE_SECRET: add the two numbers.',
      xpPenalty: 10,
      alreadyRevealed: false,
    });

    const second = await request(app)
      .get(`/api/v1/challenges/${slug}/hints/1`)
      .set('Authorization', auth(playerToken));
    expect(body<{ hint: { alreadyRevealed: boolean } }>(second).data.hint.alreadyRevealed).toBe(
      true,
    );

    const count = await prisma.playerHintReveal.count({
      where: { userId: playerId, hintId: hintIds[0] },
    });
    expect(count).toBe(1);
  });

  it('POST /:slug/runs executes only visible cases and does not persist', async () => {
    const before = await prisma.submission.count({ where: { userId: playerId, challengeId } });

    const res = await request(app)
      .post(`/api/v1/challenges/${slug}/runs`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'a=int(input())\nb=int(input())\nprint(a+b)\n' });
    expect(res.status).toBe(200);
    const run = body<{
      run: { status: string; results: Array<{ testCaseId?: string; passed: boolean }> };
    }>(res).data.run;
    expect(run.status).toBe('ACCEPTED');
    expect(run.results).toHaveLength(3);
    for (const result of run.results) {
      expect(result.passed).toBe(true);
      expect(visibleTestIds).toContain(result.testCaseId);
    }

    const after = await prisma.submission.count({ where: { userId: playerId, challengeId } });
    expect(after).toBe(before);
  });

  it('POST /:slug/runs reports a wrong answer per-test', async () => {
    const res = await request(app)
      .post(`/api/v1/challenges/${slug}/runs`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'a=int(input())\nb=int(input())\nprint(a*b)\n' });
    expect(res.status).toBe(200);
    const run = body<{ run: { status: string; results: Array<{ passed: boolean }> } }>(res).data
      .run;
    expect(run.status).toBe('WRONG_ANSWER');
    expect(run.results).toHaveLength(3);
    expect(run.results.every((result) => !result.passed)).toBe(true);
  });

  it('POST /:slug/runs is rejected without auth', async () => {
    const res = await request(app)
      .post(`/api/v1/challenges/${slug}/runs`)
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(res.status).toBe(401);
  });

  it('submissions: ownership enforced for results', async () => {
    const sub = await request(app)
      .post(`/api/v1/challenges/${slug}/submissions`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'a=int(input())\nb=int(input())\nprint(a+b)\n' });
    expect(sub.status).toBe(202);
    submissionId = body<{ submission: { id: string } }>(sub).data.submission.id;

    const status = await request(app)
      .get(`/api/v1/challenges/${slug}/submissions/${submissionId}/status`)
      .set('Authorization', auth(playerToken));
    expect(status.status).toBe(200);

    const list = await request(app)
      .get(`/api/v1/challenges/${slug}/submissions`)
      .set('Authorization', auth(playerToken));
    expect(list.status).toBe(200);
    expect(
      body<{ submissions: Array<{ id: string }> }>(list).data.submissions.some(
        (s) => s.id === submissionId,
      ),
    ).toBe(true);

    const stolen = await request(app)
      .get(`/api/v1/challenges/${slug}/submissions/${submissionId}`)
      .set('Authorization', auth(secondToken));
    expect(stolen.status).toBe(404);

    const secondPlayerSubmit = await request(app)
      .post(`/api/v1/challenges/${slug}/submissions`)
      .set('Authorization', auth(secondToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)\n' });
    expect(secondPlayerSubmit.status).toBe(202);
    const secondSubId = body<{ submission: { id: string } }>(secondPlayerSubmit).data.submission.id;
    const ownerOnly = await request(app)
      .get(`/api/v1/challenges/${slug}/submissions/${secondSubId}`)
      .set('Authorization', auth(playerToken));
    expect(ownerOnly.status).toBe(404);
  });
});
