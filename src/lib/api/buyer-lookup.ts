// Read-only PostgREST access to every Supabase table the buyer workflow's
// own agent writes to. Mirrors src/lib/api/vendor-lookup.ts: the buyer
// workflow has no run-status/polling endpoint, and per the integration plan
// the frontend never calls the workflow's own Save/Query "Simulated Output"
// tools directly (those are Yoxa's agent's tools, called autonomously while
// a triggered run executes) — so every one of these reads the resulting
// table directly with the publishable anon key, same as the vendor side.
//
// Column names for buyer_requirements / vendor_recommendations /
// buyer_vendor_selections / client_reality_profiles / solution_matches /
// gap_items / capability_frontier / meeting_requests / conversations /
// messages are taken directly from the *_openapi.yml response schemas in
// buyerworkflowopenapiconnectors/ (snake_case field names on the raw row,
// camelCase only in the edge function's JSON response). solution_models /
// roi_projections / solution_scenarios columns are NOT fully specified by
// any response schema there (Run Solution Scenarios only echoes a handful of
// ROI fields) — those two reads are deliberately defensive about which
// columns exist beyond the confirmed ones, and select("*") so nothing is
// silently dropped once the real shape is observed.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function restGet<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    // Every one of these reads backs a polling loop (dashboard stats, HITL
    // pause checks, vendor/requirement lists) that expects the *current*
    // row, not whatever the browser's HTTP cache last saw for this exact
    // URL — force a real network round-trip every time.
    cache: "no-store",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}) for ${path}.`);
  return res.json() as Promise<T>;
}

// ---- buyers -----------------------------------------------------------

export interface BuyerRow {
  id: string;
  companyName: string;
  industry: string | null;
  companySize: number | null;
  contactName: string | null;
  contactRole: string | null;
  email: string | null;
  createdAt: string;
}

// Finds the buyer row a fresh discover-form submission created, by matching
// the company name the buyer typed and requiring created_at to be after the
// trigger fired — same name+time correlation as vendor-lookup's
// findVendorCreatedAfter, for the same reason (the trigger response carries
// no buyerId of its own).
export async function findBuyerCreatedAfter(companyName: string, afterIso: string): Promise<BuyerRow | null> {
  const params = new URLSearchParams({
    select: "id,company_name,industry,company_size,contact_name,contact_role,email,created_at",
    company_name: `eq.${companyName}`,
    created_at: `gt.${afterIso}`,
    order: "created_at.asc",
    limit: "1",
  });
  const rows = await restGet<
    { id: string; company_name: string; industry: string | null; company_size: number | null; contact_name: string | null; contact_role: string | null; email: string | null; created_at: string }[]
  >(`buyers?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    companySize: row.company_size,
    contactName: row.contact_name,
    contactRole: row.contact_role,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function getBuyer(buyerId: string): Promise<BuyerRow | null> {
  const params = new URLSearchParams({
    select: "id,company_name,industry,company_size,contact_name,contact_role,email,created_at",
    id: `eq.${buyerId}`,
    limit: "1",
  });
  const rows = await restGet<
    { id: string; company_name: string; industry: string | null; company_size: number | null; contact_name: string | null; contact_role: string | null; email: string | null; created_at: string }[]
  >(`buyers?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    companySize: row.company_size,
    contactName: row.contact_name,
    contactRole: row.contact_role,
    email: row.email,
    createdAt: row.created_at,
  };
}

// ---- buyer_requirements -------------------------------------------------

export interface BuyerRequirementRow {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  source: "buyer_input" | "ai_inferred";
  status: "captured" | "clarifying" | "confirmed";
}

export async function getBuyerRequirements(buyerId: string): Promise<BuyerRequirementRow[]> {
  const params = new URLSearchParams({
    select: "id,requirement_text,priority,source,status,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.asc",
  });
  const rows = await restGet<
    { id: string; requirement_text: string; priority: "high" | "medium" | "low"; source: "buyer_input" | "ai_inferred"; status: "captured" | "clarifying" | "confirmed" }[]
  >(`buyer_requirements?${params}`);
  return rows.map((r) => ({ id: r.id, text: r.requirement_text, priority: r.priority, source: r.source, status: r.status }));
}

// ---- vendor_recommendations ---------------------------------------------

export interface VendorRecommendationRow {
  id: string;
  vendorId: string;
  fitScore: number | null;
  keyMatch: string | null;
  reason: string | null;
  confidence: number | null;
}

export async function getVendorRecommendations(buyerId: string): Promise<VendorRecommendationRow[]> {
  const params = new URLSearchParams({
    select: "id,vendor_id,fit_score,key_match,reason,confidence",
    buyer_id: `eq.${buyerId}`,
    order: "fit_score.desc",
  });
  const rows = await restGet<
    { id: string; vendor_id: string; fit_score: number | null; key_match: string | null; reason: string | null; confidence: number | null }[]
  >(`vendor_recommendations?${params}`);
  return rows.map((r) => ({ id: r.id, vendorId: r.vendor_id, fitScore: r.fit_score, keyMatch: r.key_match, reason: r.reason, confidence: r.confidence }));
}

// ---- buyer_vendor_selections ---------------------------------------------

export interface BuyerVendorSelectionRow {
  id: string;
  buyerId: string;
  vendorId: string;
  isActive: boolean;
}

// Reads the buyer's *active* vendor selection — Step 3 deactivates any prior
// selection, so isActive=true always identifies the one current context.
export async function getActiveVendorSelection(buyerId: string): Promise<BuyerVendorSelectionRow | null> {
  const params = new URLSearchParams({
    select: "id,buyer_id,vendor_id,is_active",
    buyer_id: `eq.${buyerId}`,
    is_active: "eq.true",
    limit: "1",
  });
  const rows = await restGet<{ id: string; buyer_id: string; vendor_id: string; is_active: boolean }[]>(
    `buyer_vendor_selections?${params}`
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, buyerId: row.buyer_id, vendorId: row.vendor_id, isActive: row.is_active };
}

// ---- client_reality_profiles ----------------------------------------------

export interface ClientRealityProfileRow {
  buyerId: string;
  currentTechnology: string[];
  currentCostAnnual: number | null;
  users: number | null;
  processes: string[];
  painPoints: string[];
  goals: string[];
  constraints: string[];
  timelineMonths: number | null;
  dataSources: string[];
}

export async function getClientRealityProfile(buyerId: string): Promise<ClientRealityProfileRow | null> {
  const params = new URLSearchParams({
    select:
      "buyer_id,current_technology,current_cost_annual,users,processes,pain_points,goals,constraints,timeline_months,data_sources",
    buyer_id: `eq.${buyerId}`,
    limit: "1",
  });
  const rows = await restGet<
    {
      buyer_id: string;
      current_technology: string[] | null;
      current_cost_annual: number | null;
      users: number | null;
      processes: string[] | null;
      pain_points: string[] | null;
      goals: string[] | null;
      constraints: string[] | null;
      timeline_months: number | null;
      data_sources: string[] | null;
    }[]
  >(`client_reality_profiles?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    buyerId: row.buyer_id,
    currentTechnology: row.current_technology ?? [],
    currentCostAnnual: row.current_cost_annual,
    users: row.users,
    processes: row.processes ?? [],
    painPoints: row.pain_points ?? [],
    goals: row.goals ?? [],
    constraints: row.constraints ?? [],
    timelineMonths: row.timeline_months,
    dataSources: row.data_sources ?? [],
  };
}

// ---- solution_matches / gap_items ------------------------------------------

export interface SolutionMatchRow {
  id: string;
  requirementText: string | null;
  capabilityId: string | null;
  capabilityName: string | null;
  matchStatus: "strong_match" | "partial_match" | "unmatched" | "requires_validation";
  confidence: number | null;
  reasoning: string | null;
}

export interface GapItemRow {
  id: string;
  currentState: string | null;
  desiredState: string | null;
  gap: string | null;
  severity: "high" | "medium" | "low";
}

// Filters by buyer_id + vendor_id only (not solution_model_id) — Save Fit
// and Gap Assessment persists these before a SolutionModel necessarily
// exists yet (PRD §5 Step 5), so requiring one would hide a freshly-saved
// assessment on first load.
export async function getFitAndGapAssessment(
  buyerId: string,
  vendorId: string
): Promise<{ matches: SolutionMatchRow[]; gaps: GapItemRow[] }> {
  const matchParams = new URLSearchParams({
    select: "id,requirement_text,capability_id,capability_name,match_status,confidence,reasoning",
    buyer_id: `eq.${buyerId}`,
    vendor_id: `eq.${vendorId}`,
  });
  const gapParams = new URLSearchParams({
    select: "id,current_state,desired_state,gap,severity",
    buyer_id: `eq.${buyerId}`,
    vendor_id: `eq.${vendorId}`,
  });
  const [matchRows, gapRows] = await Promise.all([
    restGet<
      { id: string; requirement_text: string | null; capability_id: string | null; capability_name: string | null; match_status: SolutionMatchRow["matchStatus"]; confidence: number | null; reasoning: string | null }[]
    >(`solution_matches?${matchParams}`),
    restGet<{ id: string; current_state: string | null; desired_state: string | null; gap: string | null; severity: GapItemRow["severity"] }[]>(
      `gap_items?${gapParams}`
    ),
  ]);
  return {
    matches: matchRows.map((r) => ({
      id: r.id,
      requirementText: r.requirement_text,
      capabilityId: r.capability_id,
      capabilityName: r.capability_name,
      matchStatus: r.match_status,
      confidence: r.confidence,
      reasoning: r.reasoning,
    })),
    gaps: gapRows.map((r) => ({ id: r.id, currentState: r.current_state, desiredState: r.desired_state, gap: r.gap, severity: r.severity })),
  };
}

// ---- solution_models / roi_projections -------------------------------------

export interface SolutionModelRow {
  id: string;
  buyerId: string;
  vendorId: string;
  status: string | null;
  version: number | null;
  executiveSummary: string | null;
  updatedAt: string | null;
}

export interface RoiProjectionRow {
  id: string;
  solutionModelId: string;
  currentAnnualCost: number | null;
  projectedAnnualCost: number | null;
  savingsPercent: number | null;
  paybackMonths: number | null;
  threeYearSavings: number | null;
  chart: unknown;
}

// solution_models' full column set is not confirmed by any OpenAPI response
// in this repo (Run Solution Scenarios only echoes solutionModelId +
// ROI fields) — select("*") and read defensively so nothing observed later
// gets silently dropped, matching the permissive-parsing convention already
// used for inbound Yoxa webhook payloads elsewhere in this codebase.
export async function getSolutionModel(buyerId: string, vendorId: string): Promise<SolutionModelRow | null> {
  const params = new URLSearchParams({
    select: "*",
    buyer_id: `eq.${buyerId}`,
    vendor_id: `eq.${vendorId}`,
    order: "updated_at.desc.nullslast",
    limit: "1",
  });
  const rows = await restGet<Record<string, unknown>[]>(`solution_models?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    buyerId: row.buyer_id as string,
    vendorId: row.vendor_id as string,
    status: (row.status as string) ?? null,
    version: (row.version as number) ?? null,
    executiveSummary: (row.executive_summary as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

export async function getRoiProjection(solutionModelId: string): Promise<RoiProjectionRow | null> {
  const params = new URLSearchParams({
    select: "id,solution_model_id,current_annual_cost,projected_annual_cost,savings_percent,payback_months,three_year_savings,chart",
    solution_model_id: `eq.${solutionModelId}`,
    limit: "1",
  });
  const rows = await restGet<
    { id: string; solution_model_id: string; current_annual_cost: number | null; projected_annual_cost: number | null; savings_percent: number | null; payback_months: number | null; three_year_savings: number | null; chart: unknown }[]
  >(`roi_projections?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    solutionModelId: row.solution_model_id,
    currentAnnualCost: row.current_annual_cost,
    projectedAnnualCost: row.projected_annual_cost,
    savingsPercent: row.savings_percent,
    paybackMonths: row.payback_months,
    threeYearSavings: row.three_year_savings,
    chart: row.chart,
  };
}

// ---- solution_scenarios ----------------------------------------------------

export interface SolutionScenarioRow {
  id: string;
  solutionModelId: string;
  name: string | null;
  inputChanges: unknown;
  resultingRoi: unknown;
  createdAt: string | null;
}

export async function getScenarios(solutionModelId: string): Promise<SolutionScenarioRow[]> {
  const params = new URLSearchParams({
    select: "*",
    solution_model_id: `eq.${solutionModelId}`,
    order: "created_at.desc",
  });
  const rows = await restGet<Record<string, unknown>[]>(`solution_scenarios?${params}`);
  return rows.map((row) => ({
    id: row.id as string,
    solutionModelId: row.solution_model_id as string,
    name: (row.name as string) ?? null,
    inputChanges: row.input_changes ?? null,
    resultingRoi: row.resulting_roi ?? null,
    createdAt: (row.created_at as string) ?? null,
  }));
}

// ---- capability_frontier ----------------------------------------------------

export interface CapabilityFrontierRow {
  id: string;
  buyerId: string;
  vendorId: string;
  question: string;
  status: "open" | "vendor_review" | "vendor_answered" | "resolved" | "closed";
  requirement: string | null;
  context: string | null;
  evidenceChecked: string[];
  reasonUnresolved: string | null;
  recommendedExpert: string | null;
  createdAt: string;
}

export async function getCapabilityFrontierItems(buyerId: string): Promise<CapabilityFrontierRow[]> {
  const params = new URLSearchParams({
    select:
      "id,buyer_id,vendor_id,question,status,requirement,context,evidence_checked,reason_unresolved,recommended_expert,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.desc",
  });
  const rows = await restGet<
    {
      id: string;
      buyer_id: string;
      vendor_id: string;
      question: string;
      status: CapabilityFrontierRow["status"];
      requirement: string | null;
      context: string | null;
      evidence_checked: string[] | null;
      reason_unresolved: string | null;
      recommended_expert: string | null;
      created_at: string;
    }[]
  >(`capability_frontier?${params}`);
  return rows.map((r) => ({
    id: r.id,
    buyerId: r.buyer_id,
    vendorId: r.vendor_id,
    question: r.question,
    status: r.status,
    requirement: r.requirement,
    context: r.context,
    evidenceChecked: r.evidence_checked ?? [],
    reasonUnresolved: r.reason_unresolved,
    recommendedExpert: r.recommended_expert,
    createdAt: r.created_at,
  }));
}

// ---- meeting_requests ---------------------------------------------------

export interface MeetingRequestRow {
  id: string;
  buyerId: string;
  vendorId: string;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  proposedDate: string | null;
  expert: string | null;
  unresolvedCount: number;
}

export async function getMeetingRequests(buyerId: string): Promise<MeetingRequestRow[]> {
  const params = new URLSearchParams({
    select: "id,buyer_id,vendor_id,status,proposed_date,expert,unresolved_count,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.desc",
  });
  const rows = await restGet<
    { id: string; buyer_id: string; vendor_id: string; status: MeetingRequestRow["status"]; proposed_date: string | null; expert: string | null; unresolved_count: number | null }[]
  >(`meeting_requests?${params}`);
  return rows.map((r) => ({
    id: r.id,
    buyerId: r.buyer_id,
    vendorId: r.vendor_id,
    status: r.status,
    proposedDate: r.proposed_date,
    expert: r.expert,
    unresolvedCount: r.unresolved_count ?? 0,
  }));
}

// ---- buyer_solution_decks ---------------------------------------------------

export interface BuyerSolutionDeckRow {
  id: string;
  buyerId: string;
  title: string | null;
  pptxUrl: string | null;
  status: "ready" | "failed";
  createdAt: string;
}

export async function getLatestSolutionDeck(buyerId: string): Promise<BuyerSolutionDeckRow | null> {
  const params = new URLSearchParams({
    select: "id,buyer_id,title,pptx_url,status,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.desc",
    limit: "1",
  });
  const rows = await restGet<
    { id: string; buyer_id: string; title: string | null; pptx_url: string | null; status: "ready" | "failed"; created_at: string }[]
  >(`buyer_solution_decks?${params}`);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, buyerId: row.buyer_id, title: row.title, pptxUrl: row.pptx_url, status: row.status, createdAt: row.created_at };
}

// Full deck history (every generated deck, not just the newest) — the
// solution workspace shows this so a buyer can see or re-download a
// previous version after a What-If Scenarios re-generation (PRD §7.4), not
// only the current one.
export async function getBuyerSolutionDecks(buyerId: string, limit = 10): Promise<BuyerSolutionDeckRow[]> {
  const params = new URLSearchParams({
    select: "id,buyer_id,title,pptx_url,status,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.desc",
    limit: String(limit),
  });
  const rows = await restGet<
    { id: string; buyer_id: string; title: string | null; pptx_url: string | null; status: "ready" | "failed"; created_at: string }[]
  >(`buyer_solution_decks?${params}`);
  return rows.map((row) => ({
    id: row.id,
    buyerId: row.buyer_id,
    title: row.title,
    pptxUrl: row.pptx_url,
    status: row.status,
    createdAt: row.created_at,
  }));
}

// ---- buyer_workflow_runs (run-completion tracking) -------------------------
// See supabase-buyer/migrations/0004_buyer_workflow_runs.sql — the durable,
// server-side record of "does this run exist and has it finished", used by
// useAgentStatus to show a distinct "your solution is ready" state instead
// of forever showing "working", and by the scheduled Yoxa-sync task to know
// which runs still need checking.

export interface BuyerWorkflowRunRow {
  id: string;
  workflowRunId: string;
  buyerId: string | null;
  status: "running" | "completed" | "failed";
  deckSyncedAt: string | null;
  completedAt: string | null;
  startedAt: string;
}

// Full history (not just the latest), for the dashboard's activity feed and
// the solution workspace's "past runs" section — see getBuyerSolutionDecks
// just below for the matching deck-history read.
export async function getBuyerWorkflowRunHistory(buyerId: string, limit = 10): Promise<BuyerWorkflowRunRow[]> {
  const params = new URLSearchParams({
    select: "id,workflow_run_id,buyer_id,status,deck_synced_at,completed_at,started_at",
    buyer_id: `eq.${buyerId}`,
    order: "started_at.desc",
    limit: String(limit),
  });
  const rows = await restGet<
    {
      id: string;
      workflow_run_id: string;
      buyer_id: string | null;
      status: "running" | "completed" | "failed";
      deck_synced_at: string | null;
      completed_at: string | null;
      started_at: string;
    }[]
  >(`buyer_workflow_runs?${params}`);
  return rows.map((row) => ({
    id: row.id,
    workflowRunId: row.workflow_run_id,
    buyerId: row.buyer_id,
    status: row.status,
    deckSyncedAt: row.deck_synced_at,
    completedAt: row.completed_at,
    startedAt: row.started_at,
  }));
}

export async function getLatestBuyerWorkflowRun(buyerId: string): Promise<BuyerWorkflowRunRow | null> {
  const params = new URLSearchParams({
    select: "id,workflow_run_id,buyer_id,status,deck_synced_at,completed_at,started_at",
    buyer_id: `eq.${buyerId}`,
    order: "started_at.desc",
    limit: "1",
  });
  const rows = await restGet<
    {
      id: string;
      workflow_run_id: string;
      buyer_id: string | null;
      status: "running" | "completed" | "failed";
      deck_synced_at: string | null;
      completed_at: string | null;
      started_at: string;
    }[]
  >(`buyer_workflow_runs?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    buyerId: row.buyer_id,
    status: row.status,
    deckSyncedAt: row.deck_synced_at,
    completedAt: row.completed_at,
    startedAt: row.started_at,
  };
}

// Client-side backfill of buyer_id onto a run row created before buyerId was
// known (see the buyer-requirement-submission route's own initial insert).
// Best-effort, fire-and-forget by design at both call sites in
// src/app/buyer/discover/page.tsx — a missed backfill just means the sync
// task's next pass (or the next submission on this run) tries again.
export async function linkBuyerWorkflowRun(workflowRunId: string, buyerId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/save-buyer-workflow-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ workflowRunId, buyerId }),
    });
  } catch {
    // best-effort — see callers
  }
}

// ---- buyer_workflow_approval_requests (HITL bridge) ------------------------

export type BuyerApprovalNodeKey =
  | "confirm_vendor_selection"
  | "adaptive_discovery_questioning"
  | "adjust_scenario_assumptions"
  | "answer_scenario_questions"
  | "query_workspace_evidence"
  | "approve_human_handoff"
  | "unknown";

export interface BuyerApprovalRequestRow {
  id: string;
  requestId: string;
  workflowRunId: string;
  buyerId: string | null;
  nodeKey: BuyerApprovalNodeKey;
  title: string | null;
  description: string | null;
  options: { id: string; label: string }[];
  status: "pending" | "resolved";
  createdAt: string;
}

// Finds the most recent still-open human-approval pause for this buyer (or,
// before a buyerId is known yet, for one of this browser's own recent
// workflow runs — see buyer-session's stored run ids) and, optionally, a
// specific node. Backed by the new buyer_workflow_approval_requests table
// (supabase-buyer/migrations) — the buyer-side equivalent of the deleted
// vendor_dna_approval_requests table.
export async function getPendingApproval(opts: {
  buyerId?: string | null;
  workflowRunIds?: string[];
  nodeKey?: BuyerApprovalNodeKey;
}): Promise<BuyerApprovalRequestRow | null> {
  const params = new URLSearchParams({
    select: "id,request_id,workflow_run_id,buyer_id,node_key,title,description,options,status,created_at",
    status: "eq.pending",
    order: "created_at.desc",
    limit: "1",
  });
  if (opts.buyerId) {
    params.set("buyer_id", `eq.${opts.buyerId}`);
  } else if (opts.workflowRunIds && opts.workflowRunIds.length > 0) {
    params.set("workflow_run_id", `in.(${opts.workflowRunIds.join(",")})`);
  } else {
    return null;
  }
  if (opts.nodeKey) params.set("node_key", `eq.${opts.nodeKey}`);

  const rows = await restGet<
    {
      id: string;
      request_id: string;
      workflow_run_id: string;
      buyer_id: string | null;
      node_key: BuyerApprovalNodeKey;
      title: string | null;
      description: string | null;
      options: { id: string; label: string }[] | null;
      status: "pending" | "resolved";
      created_at: string;
    }[]
  >(`buyer_workflow_approval_requests?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    requestId: row.request_id,
    workflowRunId: row.workflow_run_id,
    buyerId: row.buyer_id,
    nodeKey: row.node_key,
    title: row.title,
    description: row.description,
    options: row.options ?? [],
    status: row.status,
    createdAt: row.created_at,
  };
}

// ---- conversations / messages -----------------------------------------------

export interface ConversationMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseStatus: "verified" | "modelled" | "escalated" | null;
  createdAt: string;
}

// Reads the buyer's most-recently-updated conversation and all its messages
// — matches save-interaction-resolution's own "omit conversationId to reuse
// the buyer's most recently updated conversation" default, so this is the
// same thread the agent is appending to.
export async function getLatestConversationMessages(buyerId: string): Promise<ConversationMessageRow[]> {
  const convParams = new URLSearchParams({
    select: "id",
    buyer_id: `eq.${buyerId}`,
    order: "updated_at.desc",
    limit: "1",
  });
  const conversations = await restGet<{ id: string }[]>(`conversations?${convParams}`);
  const conversationId = conversations[0]?.id;
  if (!conversationId) return [];

  const msgParams = new URLSearchParams({
    select: "id,role,content,response_status,created_at",
    conversation_id: `eq.${conversationId}`,
    order: "created_at.asc",
  });
  const rows = await restGet<
    { id: string; role: "user" | "assistant"; content: string; response_status: "verified" | "modelled" | "escalated" | null; created_at: string }[]
  >(`messages?${msgParams}`);
  return rows.map((r) => ({ id: r.id, role: r.role, content: r.content, responseStatus: r.response_status, createdAt: r.created_at }));
}
