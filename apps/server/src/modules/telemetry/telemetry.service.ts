import type { Prisma } from '@prisma/client';
import { TELEMETRY_CONSENT_VERSION } from '@code-to-escape/shared';
import { env } from '../../config/index.js';
import { prisma } from '../../shared/lib/prisma.js';
import type { RecordEventsInput } from './telemetry.schema.js';

export interface TelemetryConsent {
  optIn: boolean;
  consentAt: string | null;
  consentVersion: string | null;
}

export interface TelemetrySummary {
  from: string;
  to: string;
  total: number;
  uniqueUsers: number;
  byName: Array<{ name: string; count: number }>;
}

/** Reads the account's current telemetry consent. Defaults to off when unset. */
export async function getConsent(userId: string): Promise<TelemetryConsent> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { telemetryOptIn: true, telemetryConsentAt: true, telemetryConsentVersion: true },
  });
  return {
    optIn: profile?.telemetryOptIn ?? false,
    consentAt: profile?.telemetryConsentAt?.toISOString() ?? null,
    consentVersion: profile?.telemetryConsentVersion ?? null,
  };
}

/**
 * Records the opt-in/opt-out decision and stamps it with the current policy
 * version, so consent can be audited later. Turning telemetry off stops future
 * collection but does not delete already-collected events.
 */
export async function setConsent(userId: string, optIn: boolean): Promise<TelemetryConsent> {
  const updated = await prisma.profile.updateMany({
    where: { userId },
    data: {
      telemetryOptIn: optIn,
      telemetryConsentAt: new Date(),
      telemetryConsentVersion: TELEMETRY_CONSENT_VERSION,
    },
  });
  if (updated.count === 0) {
    // A profile is created with the account, so this only happens for an
    // anomalous account. Report the safe default rather than throwing.
    return { optIn: false, consentAt: null, consentVersion: null };
  }
  return getConsent(userId);
}

/**
 * Persists a batch of events. Returns 0 without touching the database when the
 * account has not opted in, which is the authoritative gate (the client also
 * refuses to send, but the server must not rely on that).
 */
export async function recordEvents(userId: string, input: RecordEventsInput): Promise<number> {
  if (input.events.length === 0) return 0;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { telemetryOptIn: true },
  });
  if (!profile?.telemetryOptIn) return 0;

  const result = await prisma.telemetryEvent.createMany({
    data: input.events.map((event) => ({
      userId,
      name: event.name,
      payload: event.payload as Prisma.InputJsonValue | undefined,
      sessionId: input.sessionId,
    })),
  });
  return result.count;
}

/** Deletes events older than the retention window. Called by the worker sweep. */
export async function purgeExpired(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - env.telemetryRetentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.telemetryEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

/** Aggregate, engagement-only view for admins. No per-user drill-down. */
export async function summarize(from: Date, to: Date): Promise<TelemetrySummary> {
  const where: Prisma.TelemetryEventWhereInput = { createdAt: { gte: from, lte: to } };
  const grouped = await prisma.telemetryEvent.groupBy({
    by: ['name'],
    where,
    _count: { _all: true },
  });
  const users = await prisma.telemetryEvent.findMany({
    where,
    select: { userId: true },
    distinct: ['userId'],
  });
  const total = grouped.reduce((sum, group) => sum + group._count._all, 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    uniqueUsers: users.length,
    byName: grouped
      .map((group) => ({ name: group.name, count: group._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}
