import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const VAPID_PUBLIC_KEY = 'BAEdvfyH0YMVHkmWjbsFoyCZdTJ35v_wDvMxjtPl67AxXQl9awI_guN-Yn-XHpxC-LNgR1JzFp7Wcwz3gMKwmCQ';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function keyToBase64(key) {
  if (!key) return '';
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

export async function registerWebPush(userId) {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  let registration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  } catch (e) {
    console.warn('SW register failed:', e);
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
  }

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    if (!subscription) return;
    await saveSubscription(userId, subscription);
  } catch (e) {
    console.warn('Push subscribe failed:', e);
  }
}

async function saveSubscription(userId, subscription) {
  const row = {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: keyToBase64(subscription.getKey('p256dh')),
    auth: keyToBase64(subscription.getKey('auth')),
  };
  if (!row.p256dh || !row.auth) return;
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'endpoint' });
  if (error) console.warn('Save subscription failed:', error);
}

export async function disableWebPush(userId) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (subscription) {
    try {
      await subscription.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('Unsubscribe failed:', e);
    }
  }
}