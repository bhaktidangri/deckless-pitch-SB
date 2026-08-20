-- Backs the real grounded /buyer/chat (ask-grounded-question edge
-- function): a vendor-scoped variant of match_solution_capabilities (the
-- existing function search-vendor-capabilities already uses, unfiltered)
-- so a buyer's question only ever gets grounded in *their* vendor's
-- published capabilities, never a competitor's. Also enables pg_trgm so the
-- auto-triage step can cheaply detect "this open capability_frontier
-- question already exists" instead of creating a duplicate every time a
-- buyer rephrases the same unanswerable question.
create extension if not exists pg_trgm;

create or replace function public.match_solution_capabilities(
  query_embedding extensions.vector(384),
  match_count int default 20,
  min_similarity float default 0.3,
  filter_vendor_id uuid default null
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
    and (filter_vendor_id is null or c.vendor_id = filter_vendor_id)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Finds an existing open/in-review frontier item for the same buyer+vendor
-- whose question text is a close match (trigram similarity) — used to skip
-- creating a duplicate row when a buyer asks essentially the same
-- unanswerable question twice.
create or replace function public.find_similar_open_frontier_item(
  p_buyer_id uuid,
  p_vendor_id uuid,
  p_question text,
  min_similarity float default 0.55
)
returns uuid
language sql
stable
as $$
  select f.id
  from public.capability_frontier f
  where f.buyer_id = p_buyer_id
    and f.vendor_id = p_vendor_id
    and f.status in ('open', 'vendor_review')
    and similarity(f.question, p_question) >= min_similarity
  order by similarity(f.question, p_question) desc
  limit 1;
$$;
