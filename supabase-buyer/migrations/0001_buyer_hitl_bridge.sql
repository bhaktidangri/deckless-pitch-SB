-- Buyer workflow HITL bridge — see supabase-buyer/README.md.
-- Generalized version of the deleted vendor_dna_approval_requests table
-- (one row type, node_key distinguishes which of the 6 human_approval
-- nodes a pause belongs to).

create table if not exists public.buyer_workflow_approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  workflow_run_id text not null,
  buyer_id uuid references public.buyers(id) on delete set null,
  node_key text not null default 'unknown',
  title text,
  description text,
  options jsonb not null default '[]'::jsonb,
  response_url text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_value jsonb,
  resolved_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists buyer_workflow_approval_requests_buyer_id_idx
  on public.buyer_workflow_approval_requests (buyer_id);
create index if not exists buyer_workflow_approval_requests_workflow_run_id_idx
  on public.buyer_workflow_approval_requests (workflow_run_id);
create index if not exists buyer_workflow_approval_requests_status_idx
  on public.buyer_workflow_approval_requests (status, created_at desc);

alter table public.buyer_workflow_approval_requests enable row level security;

-- Public read (same "no auth on this hackathon build" posture as every
-- other buyer/vendor table read directly from the frontend with the
-- publishable anon key). Writes only ever go through the two edge
-- functions below, which use the service role key server-side.
create policy "buyer_workflow_approval_requests_public_read"
  on public.buyer_workflow_approval_requests for select
  using (true);
