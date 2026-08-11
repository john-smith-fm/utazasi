-- Utazási 1.0 — optional, cost-capped Watch scheduler.
--
-- Run manually in the Supabase SQL Editor only after:
-- 1. Vercel has OPENAI_API_KEY and WATCH_RUNNER_SECRET configured.
-- 2. At least one concrete Event has been accepted into the Timeline.
-- 3. The first manual Watch + Push smoke test has passed.
--
-- This query stores the Vercel endpoint and runner secret in Supabase Vault.
-- Do not commit real values or paste them into source-controlled files.
--
-- Prerequisite check. If either extension is absent, enable it in
-- Supabase Dashboard → Integrations before continuing.
select extname
from pg_extension
where extname in ('pg_cron', 'pg_net', 'supabase_vault')
order by extname;

-- RUN THESE TWO STATEMENTS ONCE, AFTER REPLACING ONLY THE SECOND ARGUMENTS.
-- The endpoint has no trailing slash.
-- select vault.create_secret(
--   'https://utazasi-sable.vercel.app',
--   'utazasi_watch_runner_base_url'
-- );
-- select vault.create_secret(
--   'PASTE_THE_EXISTING_WATCH_RUNNER_SECRET_HERE',
--   'utazasi_watch_runner_secret'
-- );

-- The event checker runs every 15 minutes. The application itself still only
-- calls OpenAI for a due, accepted Event at T−6/T−2/T−1.
select cron.schedule(
  'utazasi-event-watch',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'utazasi_watch_runner_base_url'
      ) || '/api/watch/run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'utazasi_watch_runner_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- Dispatch follows two minutes later and sends only unnotified material
-- changes. It is safe when there are no changes.
select cron.schedule(
  'utazasi-event-watch-dispatch',
  '2,17,32,47 * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'utazasi_watch_runner_base_url'
      ) || '/api/watch/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'utazasi_watch_runner_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- Read-only confirmation after scheduling.
select jobid, jobname, schedule, active
from cron.job
where jobname in ('utazasi-event-watch', 'utazasi-event-watch-dispatch')
order by jobname;
