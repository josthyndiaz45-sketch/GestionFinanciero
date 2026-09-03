import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gestioupled.finanzas';
const PERU_TZ = 'America/Lima';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  let mode = 'daily';
  let requestedUserId = null;

  try {
    const body = await req.json().catch(() => ({}));
    mode = body.mode === 'test' ? 'test' : 'daily';
    requestedUserId = body.userId || null;
  } catch (_) {}

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }

  if (mode === 'test') {
    const sent = await sendTestPush(requestedUserId);
    return new Response(JSON.stringify({ mode, sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sent = await sendDailyReminders();
  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function sendTestPush(userId) {
  if (!userId) return 0;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  let sent = 0;
  for (const sub of subs || []) {
    const payload = JSON.stringify({
      title: '🔔 Notificación de prueba',
      body: '¡Aquí se ve la notificación de Gestión Financiera! 📝 Recuerda registrar tus movimientos del día.',
      url: '/',
    });
    if (await sendPush(sub, payload)) sent++;
  }
  return sent;
}

async function sendDailyReminders() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (!subs || subs.length === 0) return 0;

  const userIds = [...new Set(subs.map((s) => s.user_id))];

  const { start, end } = limaDayRange();

  // Solo los usuarios sin NINGÚN movimiento registrado hoy
  const { data: active } = await supabase
    .from('transactions')
    .select('user_id')
    .in('user_id', userIds)
    .gte('date', start)
    .lt('date', end);

  const seen = new Set();
  for (const tx of active || []) seen.add(tx.user_id);

  let sent = 0;
  for (const sub of subs || []) {
    if (seen.has(sub.user_id)) continue; // tuvo al menos un movimiento -> no avisamos
    const payload = JSON.stringify({
      title: '📝 ¿Registraste tus movimientos?',
      body: 'Hoy no has registrado ningún movimiento. Lleva tu día al día anotando tus gastos e ingresos.',
      url: '/',
    });
    if (await sendPush(sub, payload)) sent++;
  }
  return sent;
}

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 60 * 60 * 24 }
    );
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    } else {
      console.warn('Push send failed:', e.statusCode, e.body);
    }
    return false;
  }
}

function limaDayRange() {
  const lima = new Date(new Date().toLocaleString('en-US', { timeZone: PERU_TZ }));
  const y = lima.getFullYear();
  const m = lima.getMonth();
  const d = lima.getDate();
  const start = new Date(Date.UTC(y, m, d)).toISOString();
  const end = new Date(Date.UTC(y, m, d + 1)).toISOString();
  return { start, end };
}
