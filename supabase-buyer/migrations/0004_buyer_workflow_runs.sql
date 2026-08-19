-- Tracks each triggered buyer workflow run's lifecycle so the frontend can
-- surface "your agent finished" independent of any single downstream
-- artifact (deck, approval, etc.) — nothing previously recorded run status
-- anywhere server-side; workflow_run_id only ever lived in the browser's
-- own localStorage (see src/lib/buyer-session.ts's RUN_IDS_KEY), which is
-- fine for correlating a pause to a tab but useless for an out-of-band
-- process (a scheduled sync) to discover "which runs exist and are they
-- done yet". This table is that durable, server-side record.
--
-- Rows are created as soon as a trigger succeeds (buyer_id may still be
-- null at that instant for a brand-new buyer — see the trigger route's own
-- comment on why buyerId isn't known synchronously) and backfilled/updated
-- from two places: the client, once it discovers its own buyerId, and the
-- scheduled Yoxa-sync task, once it observes a run's status change on
-- Yoxa's dashboard. Both go through the save-buyer-workflow-run function
-- (service role) rather than a public write policy, mirroring every other
-- write path in this schema.
create table if not exists public.buyer_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id text not null unique,
  buyer_id uuid references public.buyers(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  deck_synced_at timestamptz,
  last_checked_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  raw_status jsonb not null default '{}'::jsonb
);

create index if not exists buyer_workflow_runs_buyer_id_idx
  on public.buyer_workflow_runs (buyer_id, started_at desc);

-- Lets the sync task cheaply ask "which runs still need checking" without a
-- full table scan as history grows.
create index if not exists buyer_workflow_runs_running_idx
  on public.buyer_workflow_runs (status)
  where status = 'running';

alter table public.buyer_workflow_runs enable row level security;

create policy "buyer_workflow_runs_public_read"
  on public.buyer_workflow_runs for select
  using (true);
