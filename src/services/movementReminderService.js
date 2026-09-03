import { supabase } from '../config/supabase';
import { Platform } from 'react-native';

export async function sendTestMovementNotification(userId) {
  if (Platform.OS !== 'web') {
    return { supported: false, sent: 0, reason: 'Solo disponible en navegador' };
  }
  if (!('Notification' in window)) {
    return { supported: false, sent: 0, reason: 'Este navegador no soporta notificaciones' };
  }
  if (Notification.permission === 'denied') {
    return { supported: false, sent: 0, reason: 'Permiso de notificaciones denegado' };
  }
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { supported: false, sent: 0, reason: 'Permiso de notificaciones denegado' };
    }
  }

  if (!userId) return { supported: true, sent: 0, reason: 'Sesión no iniciada' };

  try {
    const { data, error } = await supabase.functions.invoke('movement-reminder', {
      body: { mode: 'test', userId },
    });
    if (error) throw error;
    return { supported: true, sent: data?.sent || 0 };
  } catch (err) {
    let detail = err?.message || String(err);
    if (err?.name === 'FunctionsHttpError') {
      detail = `Función respondió con error HTTP ${err.status}`;
    } else if (err?.name === 'FunctionsFetchError') {
      detail = `Error de red/CORS: ${err.message || 'no se pudo contactar la función'}`;
    } else if (err?.name === 'FunctionsRelayError') {
      detail = 'Error del relay de Supabase';
    }
    const wrapped = new Error(detail);
    wrapped.name = err?.name || 'UnknownError';
    wrapped.raw = err;
    throw wrapped;
  }
}