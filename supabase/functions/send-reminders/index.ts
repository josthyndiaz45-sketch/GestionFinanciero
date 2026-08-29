import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gestioupled.finanzas';
const PERU_TZ = 'America/Lima';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const lima = new Date(new Date().toLocaleString('en-US', { timeZone: PERU_TZ }));
  const today = new Date(lima.getFullYear(), lima.getMonth(), lima.getDate());
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const { data: reminders, error } = await supabase.from('reminders').select('*');
  if (error) return new Response(error.message, { status: 500 });

  // Reminders diarios hasta que se marque pagado
  const itemsByUser = {};
  for (const r of reminders || []) {
    if ((r.paid_months || []).includes(monthKey)) continue;
    const due = getNextDueDate(r.day_of_month, today);
    const alertDays = r.alert_timing ?? 0;
    const alertDate = new Date(due);
    alertDate.setDate(alertDate.getDate() - alertDays);
    if (alertDate > today) continue;
    (itemsByUser[r.user_id] = itemsByUser[r.user_id] || []).push({
      name: r.name,
      amount: r.amount || 0,
      due,
      days: Math.round((due - today) / 86400000),
    });
  }

  let pushSent = 0;
  let emailSent = 0;

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }

  for (const userId of Object.keys(itemsByUser)) {
    const items = itemsByUser[userId];

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);
      if (!subsError) {
        for (const sub of subs || []) {
          const payload = JSON.stringify({
            title: 'Recordatorio suave',
            body: buildPushBody(items),
            url: '/',
          });
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
              { TTL: 60 * 60 * 24 }
            );
            pushSent++;
          } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) {
              console.log('Removing expired subscription');
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            } else {
              console.warn('Push send failed:', e.statusCode, e.body);
            }
          }
        }
      }
    }

    if (RESEND_API_KEY) {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (!usersError) {
        const email = (users?.users || []).find((u) => u.id === userId)?.email;
        if (email) {
          if (await sendEmail(email, items)) emailSent++;
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ remindersDue: Object.keys(itemsByUser).length, pushSent, emailSent }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function buildPushBody(items) {
  return items.map((i) =>
    i.days < 0
      ? `${i.name}${i.amount ? ` · S/ ${Number(i.amount).toFixed(2)}` : ''} vence hoy`
      : `${i.name}${i.amount ? ` · S/ ${Number(i.amount).toFixed(2)}` : ''}`
  ).join(' · ');
}

function getNextDueDate(dayOfMonth, today) {
  let due = new Date(today.getFullYear(), today.getMonth(), Math.min(dayOfMonth, daysInMonth(today.getFullYear(), today.getMonth())));
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dayOfMonth, daysInMonth(today.getFullYear(), today.getMonth() + 1)));
  return due;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

async function sendEmail(to, items) {
  const lines = items.map((i) =>
    i.days < 0
      ? `- ${i.name}${i.amount ? ` · S/ ${Number(i.amount).toFixed(2)}` : ''} — venció el ${i.due.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PERU_TZ })}. Sigue pendiente`
      : `- ${i.name}${i.amount ? ` · S/ ${Number(i.amount).toFixed(2)}` : ''} — ${i.days === 0 ? 'vence hoy' : `vence en ${i.days} día${i.days > 1 ? 's' : ''}`}`
  ).join('\n');
  const hasToday = items.some((i) => i.days <= 0);
  const subject = hasToday
    ? `Recordatorio suave: hoy pagas ${items.length === 1 ? items[0].name : `${items.length} cosas`}`
    : `Recordatorio: tienes ${items.length} pago${items.length > 1 ? 's' : ''} próximos`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GestionFinanciero <onboarding@resend.dev>`,
      to,
      subject,
      text: `Hola,\n\ntranquilo, esto es solo un recordatorio:\n\n${lines}\n\n— GestionFinanciero`,
    }),
  });
  return res.ok;
}