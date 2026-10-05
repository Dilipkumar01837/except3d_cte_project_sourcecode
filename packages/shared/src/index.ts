export const APP_NAME = 'Code to Escape';

export const API_VERSION = 'v1';

export const API_BASE_PATH = `/api/${API_VERSION}`;

/**
 * Engagement telemetry is opt-in and limited to a fixed vocabulary shared by the
 * client and server, so the two can never disagree about which events are
 * collectable. These are engagement signals only and must not be read as
 * evidence of learning.
 */
export const TELEMETRY_EVENT_NAMES = [
  'session_start',
  'world_enter',
  'level_start',
  'level_complete',
  'challenge_open',
  'hint_reveal',
  'duel_join',
  'daily_reward_claim',
  'code_run',
  'test_case_result',
  'hint_request',
  'hint_acceptance',
  'challenge_time_spent',
  'submission_attempt',
  'execution_error',
  'duel_participation',
  'assessment_score',
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];

/** Bump when the privacy notice materially changes; stored with the consent. */
export const TELEMETRY_CONSENT_VERSION = '2026-10-01';
