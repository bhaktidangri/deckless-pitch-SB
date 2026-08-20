-- Semantic search over solution_capabilities using pgvector + Supabase Edge
-- Functions' built-in embedding model (Supabase.ai.Session("gte-small"),
-- 384 dimensions — no external embedding API/key needed). This is entirely
-- additive: a nullable embedding column plus a read-only match function.
-- Nothing here touches how the Yoxa agent writes solution_capabilities
-- (save-vendor-solution-dna-draft / publish-approved-vendor-solution-dna) —
-- embeddings are backfilled independently by the new
-- backfill-capability-embeddings edge function, called lazily by
-- search-vendor-capabilities right before it searches.
create extension if not exists vector with schema extensions;

alter table public.solution_capabilities
  add column if not exists embedding extensions.vector(384);

create index if not exists solution_capabilities_embedding_idx
  on public.solution_capabilities
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

-- Cosine-similarity match, restricted to the same "published" verification
-- statuses query-published-vendor-solution-dna already exposes buyers —
-- semantic search shouldn't surface anything a buyer couldn't already find
-- by browsing.
create or replace function public.match_solution_capabilities(
  query_embedding extensions.vector(384),
  match_count int default 20,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  vendor_id uuid,
  name text,
  description text,
  category text,
  verification_status text,
  tags text[],
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.vendor_id,
    c.name,
    c.description,
    c.category::text,
    c.verification_status::text,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.solution_capabilities c
  where c.embedding is not null
    and c.verification_status in ('verified', 'modelled')
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
