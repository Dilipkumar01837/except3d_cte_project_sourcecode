import type { TelemetryEventName } from '@code-to-escape/shared';
import {
  getTelemetryConsent,
  sendTelemetryEvents,
  type TelemetryConsent,
  type TelemetryEventInput,
} from '@/shared/lib/telemetry-api';

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BUFFER = 25;

let enabled = false;
let buffer: TelemetryEventInput[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let initializedForUser: string | null = null;
const sessionId = createSessionId();

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

/**
 * Buffers an engagement event. No-op unless the player has opted in, so nothing
 * is ever held in memory before consent.
 */
export function trackEvent(name: TelemetryEventName, payload?: Record<string, unknown>): void {
  if (!enabled) return;
  buffer.push(payload ? { name, payload } : { name });
  if (buffer.length >= MAX_BUFFER) void flushTelemetry();
}

export async function flushTelemetry(): Promise<void> {
  if (!enabled || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await sendTelemetryEvents(sessionId, batch);
  } catch {
    // Best-effort: drop the batch rather than growing an unbounded retry queue.
  }
}

/** Applies a consent decision fetched from the server (initial load or toggle). */
export function applyTelemetryConsent(consent: TelemetryConsent): void {
  const wasEnabled = enabled;
  enabled = consent.optIn;
  if (enabled && !wasEnabled) {
    trackEvent('session_start');
  }
}

/**
 * Loads consent for the signed-in player and starts periodic flushing. Safe to
 * call on every render; it only does work when the user changes.
 */
export async function initTelemetry(userId: string): Promise<void> {
  if (initializedForUser === userId) return;
  initializedForUser = userId;
  try {
    applyTelemetryConsent(await getTelemetryConsent());
  } catch {
    // Consent could not be read; leave telemetry disabled and allow a retry.
    initializedForUser = null;
    return;
  }
  if (!timer) {
    timer = setInterval(() => void flushTelemetry(), FLUSH_INTERVAL_MS);
  }
}

/** Stops collection immediately, e.g. on logout or when consent is withdrawn. */
export function resetTelemetry(): void {
  enabled = false;
  buffer = [];
  initializedForUser = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushTelemetry();
  });
}
