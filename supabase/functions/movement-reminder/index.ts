import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gestioupled.finanzas';
const PERU_TZ = 'America/Lima';
const FROM_EMAIL = 'GestionFinanciero <onboarding@resend.dev>';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

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
    const { emailSent, pushSent, email } = await sendTest(requestedUserId);
    return json({ mode, emailSent, pushSent, email });
  }

  const { emailSent, pushSent, recipients } = await sendDailyReminders();
  return json({ emailSent, pushSent, recipients });
});

async function getUserEmailMap() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return {};
  const map = {};
  for (const u of data?.users || []) {
    if (u.email) map[u.id] = u.email;
  }
  return map;
}

async function sendEmail(to, subject, text) {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
    });
    if (!res.ok) {
      console.warn('Resend failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Resend error:', e);
    return false;
  }
}

async function sendTest(userId) {
  const email = userId ? (await getUserEmailMap())[userId] : null;
  let emailSent = 0;
  let pushSent = 0;

  if (email) {
    const ok = await sendEmail(
      email,
      '🔔 Notificación de prueba — Gestión Financiera',
      '¡Hola!\n\nEsto es una notificación de prueba de Gestión Financiera. Si estás leyendo este correo, todo funciona correctamente. 📝\n\nRecuerda registrar tus movimientos del día para llevar tu economía al día.\n\n— Gestión Financiera'
    );
    if (ok) emailSent = 1;
  }

  if (userId && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
    for (const sub of subs || []) {
      const payload = JSON.stringify({
        title: '🔔 Notificación de prueba',
        body: '¡Aquí se ve la notificación de Gestión Financiera!',
        url: '/',
      });
      if (await sendPush(sub, payload)) pushSent++;
    }
  }

  return { emailSent, pushSent, email };
}

async function sendDailyReminders() {
  const activeIds = new Set();
  const { start, end } = limaDayRange();
  // Usuarios que SÍ registraron al menos un movimiento hoy
  const { data: active } = await supabase
    .from('transactions')
    .select('user_id')
    .gte('date', start)
    .lt('date', end);
  for (const tx of active || []) activeIds.add(tx.user_id);

  const emailMap = await getUserEmailMap();
  const recipients = [];

  for (const userId of Object.keys(emailMap)) {
    if (activeIds.has(userId)) continue; // tuvo movimientos hoy -> no avisamos
    recipients.push(userId);
  }

  let emailSent = 0;
  let pushSent = 0;

  // 1) Correo
  for (const userId of recipients) {
    const email = emailMap[userId];
    const ok = await sendEmail(
      email,
      '📝 ¿Registraste tus movimientos hoy? — Gestión Financiera',
      '¡Hola!\n\nHoy no has registrado ningún movimiento en Gestión Financiera.\n\nLlevar tu día al día te ayuda a controlar tus gastos. Entra a la app y anota tus ingresos o gastos del día. 💡\n\n— Gestión Financiera'
    );
    if (ok) emailSent++;
  }

  // 2) Push (opcional, extra)
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    for (const sub of subs || []) {
      if (activeIds.has(sub.user_id)) continue;
      const payload = JSON.stringify({
        title: '📝 ¿Registraste tus movimientos?',
        body: 'Hoy no has registrado ningún movimiento. Anota tus gastos e ingresos.',
        url: '/',
      });
      if (await sendPush(sub, payload)) pushSent++;
    }
  }

  return { emailSent, pushSent, recipients: recipients.length };
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
  return {
    start: new Date(Date.UTC(y, m, d)).toISOString(),
    end: new Date(Date.UTC(y, m, d + 1)).toISOString(),
  };
}
