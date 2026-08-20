// The Yoxa trigger API has no run-status/polling endpoint (see
// yoxa-trigger.ts), so Milestone 1 completion is detected by polling our own
// Supabase `vendors` table directly via PostgREST — a public, RLS-permitted
// read using the publishable key. This is the actual dynamic signal the
// vendor onboarding flow waits on.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface VendorRow {
  id: string;
  companyName: string;
  createdAt: string;
}

async function restGet<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}).`);
  return res.json() as Promise<T>;
}

// Finds the vendor row a fresh registration created, by matching the
// company name the vendor typed and requiring created_at to be after the
// trigger fired — the trigger response carries no vendorId of its own, so
// this name+time correlation is the best signal available.
export async function findVendorCreatedAfter(companyName: string, afterIso: string): Promise<VendorRow | null> {
  const params = new URLSearchParams({
    select: "id,company_name,created_at",
    company_name: `eq.${companyName}`,
    created_at: `gt.${afterIso}`,
    order: "created_at.asc",
    limit: "1",
  });
  const rows = await restGet<{ id: string; company_name: string; created_at: string }[]>(`vendors?${params}`);
  const row = rows[0];
  return row ? { id: row.id, companyName: row.company_name, createdAt: row.created_at } : null;
}

export async function countDraftCapabilities(vendorId: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/solution_capabilities?select=id&vendor_id=eq.${vendorId}`,
    {
      cache: "no-store",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}).`);
  const range = res.headers.get("content-range"); // "0-0/42"
  const total = range?.split("/")[1];
  return total ? parseInt(total, 10) : 0;
}

// ---- vendor detail --------------------------------------------------------
// Full row for a vendor's own dashboard/profile, and for admin's vendor
// detail views — everything solution DNA doesn't already cover (industry,
// hq, founded year, verification status).

export interface VendorDetailRow {
  id: string;
  companyName: string;
  industry: string | null;
  industries: string[];
  website: string | null;
  tagline: string | null;
  description: string | null;
  employeeRange: string | null;
  hq: string | null;
  foundedYear: number | null;
  verificationStatus: string;
  createdAt: string;
}

function mapVendorRow(row: {
  id: string;
  company_name: string;
  industry: string | null;
  industries: string[] | null;
  website: string | null;
  tagline: string | null;
  description: string | null;
  employee_range: string | null;
  hq: string | null;
  founded_year: number | null;
  verification_status: string;
  created_at: string;
}): VendorDetailRow {
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    industries: row.industries ?? [],
    website: row.website,
    tagline: row.tagline,
    description: row.description,
    employeeRange: row.employee_range,
    hq: row.hq,
    foundedYear: row.founded_year,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
  };
}

const VENDOR_SELECT =
  "id,company_name,industry,industries,website,tagline,description,employee_range,hq,founded_year,verification_status,created_at";

export async function getVendorById(vendorId: string): Promise<VendorDetailRow | null> {
  const params = new URLSearchParams({ select: VENDOR_SELECT, id: `eq.${vendorId}`, limit: "1" });
  const rows = await restGet<Parameters<typeof mapVendorRow>[0][]>(`vendors?${params}`);
  const row = rows[0];
  return row ? mapVendorRow(row) : null;
}

export async function getAllVendors(): Promise<VendorDetailRow[]> {
  const params = new URLSearchParams({ select: VENDOR_SELECT, order: "created_at.desc" });
  const rows = await restGet<Parameters<typeof mapVendorRow>[0][]>(`vendors?${params}`);
  return rows.map(mapVendorRow);
}

// ---- buyers (vendor/admin-facing reads) -----------------------------------

export interface LeadBuyerRow {
  id: string;
  companyName: string;
  industry: string | null;
  companySize: number | null;
  contactName: string | null;
  contactRole: string | null;
  createdAt: string;
}

function mapBuyerRow(row: {
  id: string;
  company_name: string;
  industry: string | null;
  company_size: number | null;
  contact_name: string | null;
  contact_role: string | null;
  created_at: string;
}): LeadBuyerRow {
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    companySize: row.company_size,
    contactName: row.contact_name,
    contactRole: row.contact_role,
    createdAt: row.created_at,
  };
}

const BUYER_SELECT = "id,company_name,industry,company_size,contact_name,contact_role,created_at";

// Batch lookup by id — used to resolve buyer names/industries for whichever
// set of buyer_ids a vendor_recommendations/buyer_vendor_selections read
// returns, without an N+1 request per row.
export async function getBuyersByIds(ids: string[]): Promise<LeadBuyerRow[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return [];
  const params = new URLSearchParams({ select: BUYER_SELECT, id: `in.(${unique.join(",")})` });
  const rows = await restGet<Parameters<typeof mapBuyerRow>[0][]>(`buyers?${params}`);
  return rows.map(mapBuyerRow);
}

export async function getBuyerById(buyerId: string): Promise<LeadBuyerRow | null> {
  const params = new URLSearchParams({ select: BUYER_SELECT, id: `eq.${buyerId}`, limit: "1" });
  const rows = await restGet<Parameters<typeof mapBuyerRow>[0][]>(`buyers?${params}`);
  const row = rows[0];
  return row ? mapBuyerRow(row) : null;
}

export async function getAllBuyers(): Promise<LeadBuyerRow[]> {
  const params = new URLSearchParams({ select: BUYER_SELECT, order: "created_at.desc" });
  const rows = await restGet<Parameters<typeof mapBuyerRow>[0][]>(`buyers?${params}`);
  return rows.map(mapBuyerRow);
}

// ---- vendor_recommendations (vendor-side: "who is interested in us") ------
// Mirrors buyer-lookup.ts's getVendorRecommendations, filtered by vendor_id
// instead of buyer_id — this is the real "buyers exploring your solution"
// list the vendor dashboard needs instead of dummy-data's static engagements.

export interface VendorRecommendationForVendorRow {
  id: string;
  buyerId: string;
  fitScore: number | null;
  keyMatch: string | null;
  reason: string | null;
  confidence: number | null;
}

export async function getVendorRecommendationsForVendor(vendorId: string): Promise<VendorRecommendationForVendorRow[]> {
  const params = new URLSearchParams({
    select: "id,buyer_id,fit_score,key_match,reason,confidence",
    vendor_id: `eq.${vendorId}`,
    order: "fit_score.desc",
  });
  const rows = await restGet<
    { id: string; buyer_id: string; fit_score: number | null; key_match: string | null; reason: string | null; confidence: number | null }[]
  >(`vendor_recommendations?${params}`);
  return rows.map((r) => ({ id: r.id, buyerId: r.buyer_id, fitScore: r.fit_score, keyMatch: r.key_match, reason: r.reason, confidence: r.confidence }));
}

// ---- buyer_vendor_selections (vendor-side: who actively picked us) --------

export interface BuyerVendorSelectionForVendorRow {
  id: string;
  buyerId: string;
  isActive: boolean;
}

export async function getBuyerVendorSelectionsForVendor(vendorId: string): Promise<BuyerVendorSelectionForVendorRow[]> {
  const params = new URLSearchParams({
    select: "id,buyer_id,is_active",
    vendor_id: `eq.${vendorId}`,
  });
  const rows = await restGet<{ id: string; buyer_id: string; is_active: boolean }[]>(`buyer_vendor_selections?${params}`);
  return rows.map((r) => ({ id: r.id, buyerId: r.buyer_id, isActive: r.is_active }));
}

// ---- solution matches / gaps / requirements for a specific buyer+vendor ---
// Used by the vendor's buyer-detail page — mirrors buyer-lookup.ts's
// getFitAndGapAssessment / getBuyerRequirements / getClientRealityProfile
// exactly, just called from the vendor side of the same tables.

export interface VendorSideMatchRow {
  id: string;
  requirementText: string | null;
  capabilityName: string | null;
  matchStatus: "strong_match" | "partial_match" | "unmatched" | "requires_validation";
  confidence: number | null;
  reasoning: string | null;
}

export interface VendorSideGapRow {
  id: string;
  currentState: string | null;
  desiredState: string | null;
  gap: string | null;
  severity: "high" | "medium" | "low";
}

export async function getMatchesAndGapsForBuyer(
  buyerId: string,
  vendorId: string
): Promise<{ matches: VendorSideMatchRow[]; gaps: VendorSideGapRow[] }> {
  const matchParams = new URLSearchParams({
    select: "id,requirement_text,capability_name,match_status,confidence,reasoning",
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
      { id: string; requirement_text: string | null; capability_name: string | null; match_status: VendorSideMatchRow["matchStatus"]; confidence: number | null; reasoning: string | null }[]
    >(`solution_matches?${matchParams}`),
    restGet<{ id: string; current_state: string | null; desired_state: string | null; gap: string | null; severity: VendorSideGapRow["severity"] }[]>(
      `gap_items?${gapParams}`
    ),
  ]);
  return {
    matches: matchRows.map((r) => ({
      id: r.id,
      requirementText: r.requirement_text,
      capabilityName: r.capability_name,
      matchStatus: r.match_status,
      confidence: r.confidence,
      reasoning: r.reasoning,
    })),
    gaps: gapRows.map((r) => ({ id: r.id, currentState: r.current_state, desiredState: r.desired_state, gap: r.gap, severity: r.severity })),
  };
}

export interface VendorSideRequirementRow {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  status: "captured" | "clarifying" | "confirmed";
}

export async function getRequirementsForBuyer(buyerId: string): Promise<VendorSideRequirementRow[]> {
  const params = new URLSearchParams({
    select: "id,requirement_text,priority,status,created_at",
    buyer_id: `eq.${buyerId}`,
    order: "created_at.asc",
  });
  const rows = await restGet<
    { id: string; requirement_text: string; priority: VendorSideRequirementRow["priority"]; status: VendorSideRequirementRow["status"] }[]
  >(`buyer_requirements?${params}`);
  return rows.map((r) => ({ id: r.id, text: r.requirement_text, priority: r.priority, status: r.status }));
}

export interface VendorSideRealityProfileRow {
  currentTechnology: string[];
  currentCostAnnual: number | null;
  users: number | null;
  painPoints: string[];
  goals: string[];
  constraints: string[];
  timelineMonths: number | null;
}

export async function getRealityProfileForBuyer(buyerId: string): Promise<VendorSideRealityProfileRow | null> {
  const params = new URLSearchParams({
    select: "current_technology,current_cost_annual,users,pain_points,goals,constraints,timeline_months",
    buyer_id: `eq.${buyerId}`,
    limit: "1",
  });
  const rows = await restGet<
    {
      current_technology: string[] | null;
      current_cost_annual: number | null;
      users: number | null;
      pain_points: string[] | null;
      goals: string[] | null;
      constraints: string[] | null;
      timeline_months: number | null;
    }[]
  >(`client_reality_profiles?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    currentTechnology: row.current_technology ?? [],
    currentCostAnnual: row.current_cost_annual,
    users: row.users,
    painPoints: row.pain_points ?? [],
    goals: row.goals ?? [],
    constraints: row.constraints ?? [],
    timelineMonths: row.timeline_months,
  };
}

// ---- capability_frontier / meeting_requests, scoped to one buyer+vendor ---
// getFrontierItemsForVendor / getMeetingRequestsForVendor (vendor-frontier.ts)
// already read these tables filtered by vendor_id only; these two add the
// buyer_id filter for the vendor's per-buyer detail page.

export async function getFrontierCountForVendor(vendorId: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const params = new URLSearchParams({
    vendor_id: `eq.${vendorId}`,
    status: "in.(open,vendor_review)",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/capability_frontier?${params}`, {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}).`);
  const range = res.headers.get("content-range");
  const total = range?.split("/")[1];
  return total ? parseInt(total, 10) : 0;
}
