-- Programar las Edge Functions con pg_cron
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query

-- 1) Habilitar extensiones (idempotente)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Limpiar schedules previos (para no duplicar)
select cron.unschedule('send-reminders-daily') where exists (select 1 from cron.job where jobname = 'send-reminders-daily');
select cron.unschedule('movement-reminder-daily') where exists (select 1 from cron.job where jobname = 'movement-reminder-daily');

-- 3) Recordatorio de pago: todos los dias a las 12:00 hora de Peru
--    (pg_cron usa UTC; Peru = UTC-5, asi que 12:00 Lima = 17:00 UTC)
select cron.schedule(
  'send-reminders-daily',
  '0 17 * * *',
  $$
  select net.http_post(
    url := 'https://ixqyhttyvclloedjcqxx.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_DTcjxJMRQC_zgQvx4GNctg_c0ICFpZs',
      'Authorization', 'Bearer sb_publishable_DTcjxJMRQC_zgQvx4GNctg_c0ICFpZs'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 4) Aviso "registra tus movimientos": todos los dias a las 20:30 hora de Peru
--    (20:30 Lima = 01:30 UTC del dia siguiente)
select cron.schedule(
  'movement-reminder-daily',
  '30 1 * * *',
  $$
  select net.http_post(
    url := 'https://ixqyhttyvclloedjcqxx.supabase.co/functions/v1/movement-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_DTcjxJMRQC_zgQvx4GNctg_c0ICFpZs',
      'Authorization', 'Bearer sb_publishable_DTcjxJMRQC_zgQvx4GNctg_c0ICFpZs'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Ver los jobs creados
select jobid, jobname, schedule, command from cron.job order by jobid;
