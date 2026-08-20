-- Distinguishes an agent-delivered deck (Yoxa webhook) from a locally
-- generated fallback deck (see src/app/api/buyer-solution-deck/generate-fallback
-- and src/lib/pitch-deck/) so the buyer solution workspace can label each
-- deck's provenance and so the fallback route can tell "no ready agent deck
-- yet" apart from "already has a fallback".

alter table public.buyer_solution_decks
  add column if not exists source text not null default 'agent' check (source in ('agent', 'fallback'));

comment on column public.buyer_solution_decks.source is
  'agent = delivered by the Yoxa workflow webhook; fallback = generated locally from Supabase data when the agent deck never arrived or failed.';
