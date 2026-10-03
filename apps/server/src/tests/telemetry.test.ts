import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app/create-app.js';
import { prisma } from '../shared/lib/prisma.js';
import { purgeExpired, summarize } from '../modules/telemetry/telemetry.service.js';

interface TokenUser {
  accessToken: string;
  user: { id: string };
}

function body<T>(res: { body: unknown }, _validate?: (value: unknown) => T): { data: T } {
  return res.body as { data: T };
}

const app = createApp();
const password = 'Test123456!';
const stamp = Date.now();
const emails = [
  `telemetry_a_${String(stamp)}@example.com`,
  `telemetry_admin_${String(stamp)}@example.com`,
];

async function register(index: number): Promise<TokenUser> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: emails[index],
      username: `tel_${String(index)}_${String(stamp).slice(-8)}`,
      password,
    });
  expect(res.status).toBe(201);
  return body<TokenUser>(res).data;
}

describe('Consent-gated telemetry', () => {
  let player: TokenUser;
  let admin: TokenUser;
  const auth = (token: string) => `Bearer ${token}`;

  beforeAll(async () => {
    [player, admin] = await Promise.all([register(0), register(1)]);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } }).catch(() => undefined);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/events')
      .send({ events: [{ name: 'session_start' }] });
    expect(res.status).toBe(401);
  });

  it('defaults to opted out', async () => {
    const res = await request(app)
      .get('/api/v1/telemetry/consent')
      .set('Authorization', auth(player.accessToken));
    expect(res.status).toBe(200);
    expect(body<{ optIn: boolean }>(res).data.optIn).toBe(false);
  });

  it('drops events while the account is not opted in', async () => {
    const before = await prisma.telemetryEvent.count({ where: { userId: player.user.id } });
    const res = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', auth(player.accessToken))
      .send({ sessionId: 's1', events: [{ name: 'session_start' }] });
    expect(res.status).toBe(202);
    const after = await prisma.telemetryEvent.count({ where: { userId: player.user.id } });
    expect(after).toBe(before);
  });

  it('records the opt-in decision with an auditable version and timestamp', async () => {
    const res = await request(app)
      .patch('/api/v1/telemetry/consent')
      .set('Authorization', auth(player.accessToken))
      .send({ optIn: true });
    expect(res.status).toBe(200);
    const data = body<{ optIn: boolean; consentAt: string | null; consentVersion: string | null }>(
      res,
    ).data;
    expect(data.optIn).toBe(true);
    expect(data.consentAt).not.toBeNull();
    expect(data.consentVersion).toBe('2026-10-01');
  });

  it('persists a valid batch once opted in', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', auth(player.accessToken))
      .send({
        sessionId: 's1',
        events: [
          { name: 'challenge_open', payload: { slug: 'two-sum' } },
          { name: 'hint_reveal', payload: { level: 1 } },
        ],
      });
    expect(res.status).toBe(202);
    const stored = await prisma.telemetryEvent.findMany({
      where: { userId: player.user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(stored.map((event) => event.name).sort()).toEqual(['challenge_open', 'hint_reveal']);
    expect(stored.every((event) => event.sessionId === 's1')).toBe(true);
  });

  it('rejects an event name outside the shared allow-list', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', auth(player.accessToken))
      .send({ events: [{ name: 'exfiltrate_everything' }] });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('stops recording after the player opts back out', async () => {
    await request(app)
      .patch('/api/v1/telemetry/consent')
      .set('Authorization', auth(player.accessToken))
      .send({ optIn: false });
    const before = await prisma.telemetryEvent.count({ where: { userId: player.user.id } });
    await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', auth(player.accessToken))
      .send({ events: [{ name: 'session_start' }] });
    const after = await prisma.telemetryEvent.count({ where: { userId: player.user.id } });
    expect(after).toBe(before);
  });

  it('deletes events past the retention window but keeps recent ones', async () => {
    const old = await prisma.telemetryEvent.create({
      data: {
        userId: player.user.id,
        name: 'session_start',
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      },
    });
    const recent = await prisma.telemetryEvent.create({
      data: { userId: player.user.id, name: 'session_start' },
    });

    const removed = await purgeExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await prisma.telemetryEvent.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await prisma.telemetryEvent.findUnique({ where: { id: recent.id } })).not.toBeNull();
  });

  it('cascades telemetry events when the account is deleted', async () => {
    const temp = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `telemetry_temp_${String(stamp)}@example.com`,
        username: `tel_temp_${String(stamp).slice(-8)}`,
        password,
      });
    const tempUser = body<TokenUser>(temp).data;
    await request(app)
      .patch('/api/v1/telemetry/consent')
      .set('Authorization', auth(tempUser.accessToken))
      .send({ optIn: true });
    await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', auth(tempUser.accessToken))
      .send({ events: [{ name: 'session_start' }] });
    expect(await prisma.telemetryEvent.count({ where: { userId: tempUser.user.id } })).toBe(1);

    await prisma.user.delete({ where: { id: tempUser.user.id } });
    expect(await prisma.telemetryEvent.count({ where: { userId: tempUser.user.id } })).toBe(0);
  });

  it('returns aggregates for admins and forbids players', async () => {
    const asPlayer = await request(app)
      .get('/api/v1/admin/telemetry/summary')
      .set('Authorization', auth(player.accessToken));
    expect(asPlayer.status).toBe(403);

    const asAdmin = await request(app)
      .get('/api/v1/admin/telemetry/summary')
      .set('Authorization', auth(admin.accessToken));
    expect(asAdmin.status).toBe(200);
    const summary = body<{
      total: number;
      uniqueUsers: number;
      byName: Array<{ name: string; count: number }>;
    }>(asAdmin).data;
    expect(summary.total).toBeGreaterThanOrEqual(1);
    expect(summary.uniqueUsers).toBeGreaterThanOrEqual(1);
    expect(summary.byName.length).toBeGreaterThanOrEqual(1);
  });

  it('summarizes a bounded window directly', async () => {
    const from = new Date(Date.now() - 60 * 1000);
    const to = new Date(Date.now() + 60 * 1000);
    const summary = await summarize(from, to);
    expect(summary.from).toBe(from.toISOString());
    expect(summary.total).toBeGreaterThanOrEqual(0);
  });
});
