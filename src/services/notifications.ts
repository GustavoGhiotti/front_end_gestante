import api from './api';

type PushPublicKeyOut = {
  publicKey: string;
  enabled: boolean;
};

export type PushSupportStatus =
  | 'supported'
  | 'unsupported'
  | 'insecure_context'
  | 'service_worker_unavailable'
  | 'push_manager_unavailable'
  | 'notification_unavailable';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && window.isSecureContext;
}

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure_context';
  if (!('serviceWorker' in navigator)) return 'service_worker_unavailable';
  if (!('PushManager' in window)) return 'push_manager_unavailable';
  if (!('Notification' in window)) return 'notification_unavailable';
  return 'supported';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register('/service-worker.js');
  }
  return swRegistrationPromise;
}

async function fetchPublicKey(): Promise<PushPublicKeyOut> {
  const { data } = await api.get<PushPublicKeyOut>('/notifications/public-key');
  return data;
}

async function removePushSubscription(endpoint: string): Promise<void> {
  await api.delete('/notifications/subscriptions', {
    data: { endpoint },
  });
}

export async function syncPushSubscription(options?: { forceRefresh?: boolean }): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;

  const registration = await registerAppServiceWorker();
  if (!registration) return false;

  const publicKey = await fetchPublicKey();
  if (!publicKey.enabled || !publicKey.publicKey) return false;

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && options?.forceRefresh) {
    try {
      await removePushSubscription(subscription.endpoint);
    } catch {
      // Ignora falha no cleanup remoto e tenta recriar a assinatura local mesmo assim.
    }
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(publicKey.publicKey) as unknown as BufferSource;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await api.post('/notifications/subscriptions', {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
    },
    userAgent: navigator.userAgent,
  });
  return true;
}

export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return syncPushSubscription({ forceRefresh: true });
}

export async function sendPushTestNotification(): Promise<{ delivered: boolean; detail: string }> {
  const { data } = await api.post<{ delivered: boolean; detail: string }>('/notifications/test');
  return data;
}

export async function sendMedicationPushTest(medicationId: string): Promise<{ delivered: boolean; detail: string }> {
  const { data } = await api.post<{ delivered: boolean; detail: string }>(`/medicamentos/${medicationId}/lembrete-teste`);
  return data;
}
