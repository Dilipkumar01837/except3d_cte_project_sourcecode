import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { apiClient } from '@/shared/lib/api-client';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const configured =
  Object.values(config).every(Boolean) && Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY);
let registration: ServiceWorkerRegistration | undefined;

export function pushConfigured(): boolean {
  return configured && (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PUSH === 'true');
}
export async function enablePushNotifications(): Promise<boolean> {
  if (!pushConfigured() || Notification.permission === 'denied' || !(await isSupported()))
    return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const ready = await navigator.serviceWorker.ready;
  ready.active?.postMessage({ type: 'firebase-config', config });
  const app = getApps().length ? getApp() : initializeApp(config);
  // Firebase v12 deprecates getToken in favor of installation-ID messaging;
  // registration tokens remain the web push API supported by this app.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  await apiClient.post('/notifications/register-token', {
    token,
    deviceInfo: navigator.userAgent.slice(0, 200),
  });
  return true;
}
export async function disablePushNotifications(): Promise<void> {
  if (registration) registration = undefined;
  await apiClient.delete('/notifications/unregister-token');
}
export async function listenForForegroundPush(
  onNotification: (payload: MessagePayload) => void,
): Promise<() => void> {
  if (!pushConfigured() || !(await isSupported())) return () => undefined;
  const app = getApps().length ? getApp() : initializeApp(config);
  return onMessage(getMessaging(app), onNotification);
}
