-- Enables Supabase Realtime (Postgres CDC broadcast) on every table the
-- frontend currently discovers changes to by polling (see
-- src/lib/hooks/use-realtime-refresh.ts). This alone doesn't change what
-- any page shows — it only lets a client *subscribe* to a table; each call
-- site still applies its own buyer_id/vendor_id filter narrowing which rows
-- it's notified about, same scoping as its existing REST reads.
alter publication supabase_realtime add table
  public.organizations,
  public.vendors,
  public.buyers,
  public.buyer_requirements,
  public.client_reality_profiles,
  public.vendor_recommendations,
  public.buyer_vendor_selections,
  public.solution_models,
  public.solution_matches,
  public.gap_items,
  public.roi_projections,
  public.solution_scenarios,
  public.capability_frontier,
  public.conversations,
  public.messages,
  public.meeting_requests,
  public.vendor_dna_approval_requests,
  public.vendor_knowledge_documents,
  public.buyer_workflow_approval_requests,
  public.buyer_solution_decks,
  public.buyer_workflow_runs,
  public.vendor_outreach_events,
  public.audit_events,
  public.solution_capabilities,
  public.solution_evidence;
