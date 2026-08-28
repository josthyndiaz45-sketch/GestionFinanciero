import { supabase } from '../config/supabase';

function isJwtFutureError(err) {
  if (!err) return false;
  if (err.code === 'PGRST303') return true;
  if (err.message?.includes('JWT issued at future')) return true;
  return false;
}

async function refreshSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  } catch (_) {}
}

export async function safeQuery(fn) {
  try {
    const result = await fn();
    if (result?.error && isJwtFutureError(result.error)) {
      await refreshSession();
      return await fn();
    }
    return result;
  } catch (err) {
    if (isJwtFutureError(err)) {
      await refreshSession();
      return await fn();
    }
    throw err;
  }
}
