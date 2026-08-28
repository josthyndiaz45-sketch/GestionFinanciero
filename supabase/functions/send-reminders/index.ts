import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const PERU_TZ = 'America/Lima';

Deno.serve(async () => {
  if (!RESEND_API_KEY) return new Response('Falta RESEND_API_KEY', { status: 500 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const lima = new Date(new Date().toLocaleString('en-US', { timeZone: PERU_TZ }));
  const today = new Date(lima.getFullYear(), lima.getMonth(), lima.getDate());
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const { data: reminders, error } = await supabase.from('reminders').select('*');
  if (error) return new Response(error.message, { status: 500 });

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) return new Response(usersError.message, { status: 500 });

  const emailByUser = new Map((users?.users || []).map((u) => [u.id, u.email]));
  const byUser = {};

  for (const r of reminders || []) {
    if ((r.paid_months || []).includes(monthKey)) continue;
    const due = getNextDueDate(r.day_of_month, today);
    if (r.end_year && due.getFullYear() > r.end_year) continue;
    const alertDays = r.alert_timing ?? 0;
    const alertDate = new Date(due);
    alertDate.setDate(alertDate.getDate() - alertDays);
    if (!sameDay(alertDate, today)) continue;
    const email = emailByUser.get(r.user_id);
    if (!email) continue;
    (byUser[email] = byUser[email] || []).push({
      name: r.name,
      amount: r.amount || 0,
      due: due.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PERU_TZ }),
      days: Math.round((due - today) / 86400000),
    });
  }

  let sent = 0;
  for (const [email, items] of Object.entries(byUser)) {
    if (await sendEmail(email, items)) sent++;
  }
  return new Response(JSON.stringify({ handled: Object.keys(byUser).length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function getNextDueDate(dayOfMonth, today) {
  let due = new Date(today.getFullYear(), today.getMonth(), Math.min(dayOfMonth, daysInMonth(today.getFullYear(), today.getMonth())));
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dayOfMonth, daysInMonth(today.getFullYear(), today.getMonth() + 1)));
  return due;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

async function sendEmail(to, items) {
  const lines = items.map((i) =>
    `- ${i.name}${i.amount ? ` · S/ ${Number(i.amount).toFixed(2)}` : ''} — vence ${i.due}${i.days === 0 ? ' (hoy)' : ` (en ${i.days} día${i.days > 1 ? 's' : ''})`}`
  ).join('\n');
  const hasToday = items.some((i) => i.days === 0);
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