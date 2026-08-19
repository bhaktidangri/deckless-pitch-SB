-- Buyer-facing .pptx deck delivery — see supabase-buyer/README.md item 2.
-- Mirrors vendor_knowledge_documents / vendor-knowledge-pptx exactly.

create table if not exists public.buyer_solution_decks (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  solution_model_id uuid references public.solution_models(id) on delete set null,
  workflow_run_id text,
  title text,
  pptx_url text,
  status text not null default 'ready' check (status in ('ready', 'failed')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists buyer_solution_decks_buyer_id_idx
  on public.buyer_solution_decks (buyer_id, created_at desc);

alter table public.buyer_solution_decks enable row level security;

create policy "buyer_solution_decks_public_read"
  on public.buyer_solution_decks for select
  using (true);

insert into storage.buckets (id, name, public)
values ('buyer-solution-pptx', 'buyer-solution-pptx', true)
on conflict (id) do nothing;

create policy "buyer_solution_pptx_public_read"
  on storage.objects for select
  using (bucket_id = 'buyer-solution-pptx');
