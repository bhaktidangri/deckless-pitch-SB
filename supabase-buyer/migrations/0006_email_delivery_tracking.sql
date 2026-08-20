-- Real email delivery + open/click tracking for the two vendor-portal
-- outreach paths that previously only ever opened a mailto: link:
-- record-vendor-outreach (EmailBuyerCard) and schedule-meeting-direct
-- (ScheduleMeetingCard, which also now sends a real .ics-attached invite).
-- Neither of these tables is written by the Yoxa agent's own tools in a way
-- these new columns interact with — meeting_requests IS also written by the
-- agent's schedule-vendor-discussion tool, but these are new, nullable/
-- defaulted columns the agent's own inserts simply never set, so this is
-- purely additive and doesn't change anything about the agent's own rows.
--
-- email_status/invite_email_status: 'not_sent' (no provider configured or
-- not attempted), 'sent', 'failed', or 'skipped_no_email' (buyer has no
-- email on file). email_provider_id / invite_email_provider_id hold a
-- self-minted tracking id passed to SendGrid as custom_args.tracking_id,
-- which src/app/api/webhooks/sendgrid/route.ts uses to match an inbound
-- delivery/open/click event back to the right row.

alter table public.vendor_outreach_events
  add column if not exists email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed', 'skipped_no_email')),
  add column if not exists email_provider_id text,
  add column if not exists email_error text,
  add column if not exists opened_at timestamptz,
  add column if not exists open_count integer not null default 0,
  add column if not exists clicked_at timestamptz,
  add column if not exists click_count integer not null default 0,
  add column if not exists last_clicked_url text;

create index if not exists vendor_outreach_events_email_provider_id_idx
  on public.vendor_outreach_events (email_provider_id)
  where email_provider_id is not null;

alter table public.meeting_requests
  add column if not exists invite_email_status text not null default 'not_sent'
    check (invite_email_status in ('not_sent', 'sent', 'failed', 'skipped_no_email')),
  add column if not exists invite_email_provider_id text,
  add column if not exists invite_email_error text,
  add column if not exists invite_opened_at timestamptz,
  add column if not exists invite_open_count integer not null default 0,
  add column if not exists invite_clicked_at timestamptz,
  add column if not exists invite_click_count integer not null default 0;

create index if not exists meeting_requests_invite_email_provider_id_idx
  on public.meeting_requests (invite_email_provider_id)
  where invite_email_provider_id is not null;
