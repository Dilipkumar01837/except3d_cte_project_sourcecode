import { z } from 'zod';
import { TELEMETRY_EVENT_NAMES } from '@code-to-escape/shared';
import { env } from '../../config/index.js';

/**
 * Events are restricted to the shared allow-list, so a client cannot invent new
 * event names and the vocabulary cannot drift between client and server.
 */
export const telemetryEventNameSchema = z.enum(TELEMETRY_EVENT_NAMES);

export const recordEventsSchema = z.object({
  sessionId: z.string().min(1).max(100).optional(),
  events: z
    .array(
      z.object({
        name: telemetryEventNameSchema,
        payload: z.record(z.unknown()).optional(),
      }),
    )
    .max(env.telemetryMaxBatch),
});

export const setConsentSchema = z.object({
  optIn: z.boolean(),
});

export type RecordEventsInput = z.infer<typeof recordEventsSchema>;
export type SetConsentInput = z.infer<typeof setConsentSchema>;
