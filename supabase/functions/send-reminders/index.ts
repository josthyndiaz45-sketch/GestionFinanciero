import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gestioupled.finanzas';
const PERU_TZ = 'America/Lima';
const LOGO_URL = 'https://raw.githubusercontent.com/josthyndiaz45-sketch/GestionFinanciero/main/public/logo.png';
const PRIMARY = '#2563EB';

function emailHtml(title, bodyHtml) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
  <div style="background:#F4F6FB;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
      <tr>
        <td align="center" style="padding:28px 24px 8px;">
          <img src="${esc(LOGO_URL)}" alt="Gestión Financiera" width="84" height="84" style="border-radius:16px;display:block;" />
          <div style="margin-top:10px;font-size:18px;font-weight:bold;color:#0F172A;">Gestión Financiera</div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px 6px;font-size:16px;font-weight:bold;color:${PRIMARY};">
          ${esc(title)}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 28px 20px;font-size:14px;line-height:1.6;color:#334155;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;background:#F1F5F9;font-size:12px;color:#64748B;text-align:center;">
          Lleva tu economía al día con Gestión Financiera 🐒
        </td>
      </tr>
    </table>
  </div>`;
}

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
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = items.map((i) => {
    const amt = i.amount ? ` <b>S/ ${Number(i.amount).toFixed(2)}</b>` : '';
    if (i.days < 0) {
      return `<li>${esc(i.name)}${amt} — venció el ${i.due.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PERU_TZ })}. Sigue pendiente</li>`;
    }
    return `<li>${esc(i.name)}${amt} — ${i.days === 0 ? 'vence hoy' : `vence en ${i.days} día${i.days > 1 ? 's' : ''}`}</li>`;
  }).join('');
  const hasToday = items.some((i) => i.days <= 0);
  const subject = hasToday
    ? `Recordatorio suave: hoy pagas ${items.length === 1 ? items[0].name : `${items.length} cosas`}`
    : `Recordatorio: tienes ${items.length} pago${items.length > 1 ? 's' : ''} próximos`;
  const bodyHtml = `¡Hola! 👋<br/><br/>Tranquilo, esto es solo un recordatorio de tus pagos:<br/><ul style="margin:8px 0 0 20px;padding:0;">${lines}</ul><br/>— Gestión Financiera`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GestionFinanciero <onboarding@resend.dev>`,
      to,
      subject,
      html: emailHtml(subject, bodyHtml),
    }),
  });
  return res.ok;
}