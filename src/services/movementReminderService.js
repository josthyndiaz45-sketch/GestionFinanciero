import { supabase } from '../config/supabase';

export async function sendTestMovementNotification(userId) {
  if (!userId) {
    return { sent: false, reason: 'Sesión no iniciada' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('movement-reminder', {
      body: { mode: 'test', userId },
    });
    if (error) throw error;
    const emailSent = Number(data?.emailSent) || 0;
    return {
      sent: emailSent > 0,
      email: data?.email || null,
      emailSent,
      pushSent: Number(data?.pushSent) || 0,
    };
  } catch (err) {
    let detail = err?.message || String(err);
    if (err?.name === 'FunctionsHttpError') {
      detail = `La función respondió con error HTTP ${err.status}`;
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
