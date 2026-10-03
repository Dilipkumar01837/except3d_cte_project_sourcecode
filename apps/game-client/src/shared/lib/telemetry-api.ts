import { apiClient } from '@/shared/lib/api-client';
import type { TelemetryEventName } from '@code-to-escape/shared';

export interface TelemetryConsent {
  optIn: boolean;
  consentAt: string | null;
  consentVersion: string | null;
}

export interface TelemetryEventInput {
  name: TelemetryEventName;
  payload?: Record<string, unknown>;
}

export async function getTelemetryConsent(): Promise<TelemetryConsent> {
  const { data } = await apiClient.get<{ data: TelemetryConsent }>('/telemetry/consent');
  return data.data;
}

export async function setTelemetryConsent(optIn: boolean): Promise<TelemetryConsent> {
  const { data } = await apiClient.patch<{ data: TelemetryConsent }>('/telemetry/consent', {
    optIn,
  });
  return data.data;
}

/**
 * Sends a batch with `keepalive` so the last events survive a page unload. Uses
 * fetch rather than the axios client because the axios interceptors are not
 * reliable during unload.
 */
export async function sendTelemetryEvents(
  sessionId: string,
  events: TelemetryEventInput[],
): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await fetch('/api/v1/telemetry/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, events }),
    credentials: 'include',
    keepalive: true,
  });
  if (!response.ok) throw new Error(`Telemetry rejected with status ${String(response.status)}`);
}
