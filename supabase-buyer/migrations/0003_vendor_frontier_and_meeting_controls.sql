-- PRD §7.7 stated blocker: "the vendor pages currently have no working
-- answer/confirm controls wired up in the frontend and need one before this
-- step can close the loop end-to-end." capability_frontier and
-- meeting_requests already exist (owned by the buyer workflow's own Save
-- tools) — this only adds the columns the two new vendor-side controls need
-- to write to, idempotently, without touching the buyer-workflow-owned ones.

alter table public.capability_frontier
  add column if not exists vendor_response text,
  add column if not exists resolved_at timestamptz;

alter table public.meeting_requests
  add column if not exists confirmed_at timestamptz;
