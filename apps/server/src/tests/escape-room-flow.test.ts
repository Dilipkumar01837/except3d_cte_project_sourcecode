/**
 * Escape-room flow — server-authoritative gating.
 *
 * Proves the room a challenge lives in is enforced by the API and not only by
 * the UI: a locked or out-of-sequence level rejects a direct submission with 403,
 * a reachable level accepts it, and a key turns a locked door into an open one.
 * Standalone (unbound) challenges stay freely playable.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app/create-app.js';
import { prisma } from '../shared/lib/prisma.js';
import { resolveChallengeRoom } from '../modules/worlds/challenge-room.service.js';

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
  user: { id: string };
}

const app = createApp();
const password = 'Test123456!';
const stamp = Date.now();
const email = `esc_${String(stamp)}@example.com`;
const username = `esc_${String(stamp).slice(-6)}`;

async function makeChallenge(slug: string, title: string): Promise<string> {
  const challenge = await prisma.challenge.create({
    data: {
      slug,
      title,
      statement: 'Read two integers and print their sum.',
      difficulty: 'EASY',
      type: 'ALGORITHMS',
      supportedLanguages: ['PYTHON'],
      xpReward: 50,
      isPublished: true,
      testCases: {
        create: [{ input: '1\n2\n', expectedOutput: '3\n', isHidden: false, sortOrder: 0 }],
      },
    },
    select: { id: true },
  });
  return challenge.id;
}

describe('Escape-room flow — server-authoritative gating', () => {
  let worldId = '';
  let level1Id = '';
  let level3Id = '';
  let keyId = '';
  let openChallengeId = '';
  let lockedChallengeId = '';
  let freeChallengeId = '';
  let playerId = '';

  const openSlug = `esc-open-${String(stamp)}`;
  const lockedSlug = `esc-locked-${String(stamp)}`;
  const freeSlug = `esc-free-${String(stamp)}`;
  let playerToken = '';

  beforeAll(async () => {
    openChallengeId = await makeChallenge(openSlug, 'First Clearing');
    lockedChallengeId = await makeChallenge(lockedSlug, 'High Ridge');
    freeChallengeId = await makeChallenge(freeSlug, 'Standalone Practice');

    const world = await prisma.gameWorld.create({
      data: {
        slug: `esc-world-${String(stamp)}`,
        name: 'Esc Test World',
        description: 'A world created for the escape-room gate test.',
        sortOrder: stamp % 1_000_000_000,
        isPublished: true,
      },
      select: { id: true },
    });
    worldId = world.id;

    const level1 = await prisma.gameLevel.create({
      data: {
        worldId,
        number: 1,
        title: 'First Clearing',
        description: 'Read two integers and print their sum.',
        challengeId: openChallengeId,
        isPublished: true,
      },
      select: { id: true },
    });
    level1Id = level1.id;

    const level3 = await prisma.gameLevel.create({
      data: {
        worldId,
        number: 3,
        title: 'High Ridge',
        description: 'Compare three values and print the largest.',
        challengeId: lockedChallengeId,
        isPublished: true,
      },
      select: { id: true },
    });
    level3Id = level3.id;

    const key = await prisma.roomKey.create({
      data: {
        worldId,
        slug: `esc-key-${String(stamp)}`,
        title: 'Trail Key',
        description: 'Brass, worn smooth.',
        grantedByLevelId: level1Id,
        isPublished: true,
      },
      select: { id: true },
    });
    keyId = key.id;

    await prisma.roomLock.create({
      data: {
        worldId,
        levelId: level3Id,
        title: 'Ridge Gate',
        prompt: 'A chained gate with an old padlock.',
        requiresKeyId: keyId,
        isPublished: true,
      },
    });

    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, username, password });
    expect(registered.status).toBe(201);
    const data = body<TokenUser>(registered).data;
    playerId = data.user.id;
    playerToken = data.accessToken;
  });

  afterAll(async () => {
    if (worldId) await prisma.gameWorld.delete({ where: { id: worldId } }).catch(() => undefined);
    await prisma.challenge
      .deleteMany({
        where: {
          id: { in: [openChallengeId, lockedChallengeId, freeChallengeId].filter(Boolean) },
        },
      })
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  });

  const auth = (token: string) => `Bearer ${token}`;

  it('treats an unbound challenge as free play', async () => {
    expect(await resolveChallengeRoom(playerId, freeChallengeId)).toBeNull();
  });

  it('resolves access for a bound challenge the way the map does', async () => {
    const open = await resolveChallengeRoom(playerId, openChallengeId);
    expect(open).toMatchObject({ access: 'OPEN', levelId: level1Id });
    expect(open?.grantsKeyTitle).toBe('Trail Key');

    const locked = await resolveChallengeRoom(playerId, lockedChallengeId);
    expect(locked?.access).toBe('LOCKED');
    expect(locked?.missingKeySlug).toBe(`esc-key-${String(stamp)}`);
    expect(locked?.lock?.requiresKeyTitle).toBe('Trail Key');
  });

  it('exposes the room context on the challenge for signed-in players only', async () => {
    const signedIn = await request(app)
      .get(`/api/v1/challenges/${lockedSlug}`)
      .set('Authorization', auth(playerToken));
    expect(signedIn.status).toBe(200);
    expect(
      body<{ challenge: { gameLevelContext: { access: string } | null } }>(signedIn).data.challenge
        .gameLevelContext?.access,
    ).toBe('LOCKED');

    const anonymous = await request(app).get(`/api/v1/challenges/${lockedSlug}`);
    expect(anonymous.status).toBe(200);
    expect(
      body<{ challenge: { gameLevelContext: unknown } }>(anonymous).data.challenge.gameLevelContext,
    ).toBeNull();
  });

  it('rejects a direct submission to a locked room', async () => {
    const res = await request(app)
      .post(`/api/v1/challenges/${lockedSlug}/submissions`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(res.status).toBe(403);
    expect(body(res).error?.code).toBe('ROOM_LOCKED');
  });

  it('accepts a submission to a reachable room and to a free challenge', async () => {
    const open = await request(app)
      .post(`/api/v1/challenges/${openSlug}/submissions`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(open.status).toBe(202);

    const free = await request(app)
      .post(`/api/v1/challenges/${freeSlug}/submissions`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(free.status).toBe(202);
  });

  it('lets a held key open the door it belongs to', async () => {
    await prisma.playerLevelProgress.create({
      data: { userId: playerId, levelId: level1Id, isCompleted: true, completedAt: new Date() },
    });
    await prisma.playerRoomKey.create({ data: { userId: playerId, keyId } });

    const resolved = await resolveChallengeRoom(playerId, lockedChallengeId);
    expect(resolved?.access).toBe('OPEN');

    const res = await request(app)
      .post(`/api/v1/challenges/${lockedSlug}/submissions`)
      .set('Authorization', auth(playerToken))
      .send({ language: 'PYTHON', sourceCode: 'print(1)' });
    expect(res.status).toBe(202);
  });

  it('records room clue discovery and surfaces it on the level list', async () => {
    const unauthorized = await request(app).post(`/api/v1/player/levels/${level3Id}/discovery`);
    expect(unauthorized.status).toBe(401);

    const created = await request(app)
      .post(`/api/v1/player/levels/${level3Id}/discovery`)
      .set('Authorization', auth(playerToken));
    expect(created.status).toBe(200);
    expect(body<{ discovery: { clueRead: boolean } }>(created).data.discovery.clueRead).toBe(true);

    // Idempotent: a second discovery updates the existing row instead of failing.
    const again = await request(app)
      .post(`/api/v1/player/levels/${level3Id}/discovery`)
      .set('Authorization', auth(playerToken));
    expect(again.status).toBe(200);

    const levels = await request(app)
      .get(`/api/v1/player/worlds/${worldId}/levels`)
      .set('Authorization', auth(playerToken));
    expect(levels.status).toBe(200);
    const list = body<{ world: { levels: { id: string; progress: { clueRead: boolean }[] }[] } }>(
      levels,
    ).data.world.levels;
    const level3 = list.find((entry) => entry.id === level3Id);
    expect(level3?.progress[0]?.clueRead).toBe(true);
  });

  it('rejects discovery for an unknown room', async () => {
    const res = await request(app)
      .post('/api/v1/player/levels/does-not-exist/discovery')
      .set('Authorization', auth(playerToken));
    expect(res.status).toBe(404);
  });
});
