// Read-only PostgREST access for the admin/platform portal. Same anon-key
// pattern as buyer-lookup.ts / vendor-lookup.ts — see the RLS migration
// "add_public_read_policies_for_frontend_tables" for why this now actually
// returns rows instead of silently coming back empty (this app has no
// Supabase Auth session anywhere, so every "is_org_member(...) OR
// is_platform_admin()" policy previously blocked every anon-key read).
//
// getAllVendors / getAllBuyers already live in vendor-lookup.ts (the admin
// vendor/buyer tables are literally "every row", the same shape a vendor's
// own profile read already needs) — re-exported here so admin pages only
// need to import from one place.

export { getAllVendors, getAllBuyers, type VendorDetailRow, type LeadBuyerRow } from "./vendor-lookup";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function restGet<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}) for ${path}.`);
  return res.json() as Promise<T>;
}

async function restCount(path: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}) for ${path}.`);
  const range = res.headers.get("content-range");
  const total = range?.split("/")[1];
  return total ? parseInt(total, 10) : 0;
}

// ---- organizations ----------------------------------------------------

export interface OrganizationRow {
  id: string;
  name: string;
  type: "vendor" | "buyer";
  createdAt: string;
}

export async function getRecentOrganizations(limit = 8): Promise<OrganizationRow[]> {
  const params = new URLSearchParams({ select: "id,name,type,created_at", order: "created_at.desc", limit: String(limit) });
  const rows = await restGet<{ id: string; name: string; type: "vendor" | "buyer"; created_at: string }[]>(`organizations?${params}`);
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, createdAt: r.created_at }));
}

// ---- platform-wide stats -------------------------------------------------

export interface PlatformStats {
  totalOrganizations: number;
  activeVendors: number;
  activeBuyers: number;
  totalSolutionModels: number;
  groundedAnswerRate: number | null;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [totalOrganizations, activeVendors, activeBuyers, totalSolutionModels, totalMessages, verifiedMessages] = await Promise.all([
    restCount("organizations?select=id"),
    restCount("vendors?select=id"),
    restCount("buyers?select=id"),
    restCount("solution_models?select=id"),
    restCount("messages?select=id&role=eq.assistant"),
    restCount("messages?select=id&role=eq.assistant&response_status=eq.verified"),
  ]);
  return {
    totalOrganizations,
    activeVendors,
    activeBuyers,
    totalSolutionModels,
    groundedAnswerRate: totalMessages > 0 ? Math.round((verifiedMessages / totalMessages) * 100) : null,
  };
}

// ---- platform activity (solution models + frontier questions per week) ---
// The closest real analogs to dummy-data's "solutions generated" /
// "questions resolved" weekly series — bucketed client-side from raw
// created_at timestamps since there's no pre-aggregated table for this.

export interface PlatformActivityWeek {
  week: string;
  solutions: number;
  questions: number;
}

function bucketByWeek(timestamps: string[], weeks: number): number[] {
  const now = timestamps.length > 0 ? new Date(Math.max(...timestamps.map((t) => new Date(t).getTime()))) : new Date();
  const buckets = new Array(weeks).fill(0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const endOfLastBucket = now.getTime();
  for (const t of timestamps) {
    const diff = endOfLastBucket - new Date(t).getTime();
    const idx = weeks - 1 - Math.floor(diff / weekMs);
    if (idx >= 0 && idx < weeks) buckets[idx] += 1;
  }
  return buckets;
}

export async function getPlatformActivitySeries(weeks = 6): Promise<PlatformActivityWeek[]> {
  const [solutionModels, frontierItems] = await Promise.all([
    restGet<{ created_at: string }[]>(`solution_models?select=created_at&order=created_at.desc&limit=500`),
    restGet<{ created_at: string }[]>(`capability_frontier?select=created_at&order=created_at.desc&limit=500`),
  ]);
  const solutionBuckets = bucketByWeek(solutionModels.map((r) => r.created_at), weeks);
  const questionBuckets = bucketByWeek(frontierItems.map((r) => r.created_at), weeks);
  return Array.from({ length: weeks }, (_, i) => ({
    week: i === weeks - 1 ? "This wk" : `${weeks - 1 - i}w ago`,
    solutions: solutionBuckets[i],
    questions: questionBuckets[i],
  }));
}

// ---- cross-portal engagement (every recommendation / selection) ----------
// Unfiltered reads of the same two tables vendor-lookup.ts reads scoped to
// one vendor — the admin buyers table needs "this buyer's best fit + stage
// across ALL vendors", which needs the full table, not a vendor_id slice.

export interface AdminVendorRecommendationRow {
  id: string;
  buyerId: string;
  vendorId: string;
  fitScore: number | null;
}

export async function getAllVendorRecommendations(): Promise<AdminVendorRecommendationRow[]> {
  const params = new URLSearchParams({ select: "id,buyer_id,vendor_id,fit_score", order: "fit_score.desc" });
  const rows = await restGet<{ id: string; buyer_id: string; vendor_id: string; fit_score: number | null }[]>(`vendor_recommendations?${params}`);
  return rows.map((r) => ({ id: r.id, buyerId: r.buyer_id, vendorId: r.vendor_id, fitScore: r.fit_score }));
}

export interface AdminBuyerVendorSelectionRow {
  id: string;
  buyerId: string;
  vendorId: string;
  isActive: boolean;
}

export async function getAllBuyerVendorSelections(): Promise<AdminBuyerVendorSelectionRow[]> {
  const params = new URLSearchParams({ select: "id,buyer_id,vendor_id,is_active" });
  const rows = await restGet<{ id: string; buyer_id: string; vendor_id: string; is_active: boolean }[]>(`buyer_vendor_selections?${params}`);
  return rows.map((r) => ({ id: r.id, buyerId: r.buyer_id, vendorId: r.vendor_id, isActive: r.is_active }));
}

export interface AdminFrontierCountRow {
  buyerId: string;
  openCount: number;
}

export async function getOpenFrontierCountsByBuyer(): Promise<Record<string, number>> {
  const params = new URLSearchParams({ select: "buyer_id", status: "in.(open,vendor_review)" });
  const rows = await restGet<{ buyer_id: string }[]>(`capability_frontier?${params}`);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.buyer_id] = (counts[r.buyer_id] ?? 0) + 1;
  return counts;
}

// ---- audit_events ----------------------------------------------------------
// Shaped directly as lib/types.ts's AuditEvent so it drops straight into the
// existing <AuditTimeline> component with no extra mapping at the call site.

import type { AuditEvent } from "@/lib/types";

export async function getAuditEvents(limit = 50, organizationId?: string): Promise<AuditEvent[]> {
  const params = new URLSearchParams({
    select: "id,agent_name,action,entity_type,entity_name,confidence,human_verified,created_at",
    order: "created_at.desc",
    limit: String(limit),
  });
  if (organizationId) params.set("organization_id", `eq.${organizationId}`);
  const rows = await restGet<
    {
      id: string;
      agent_name: string;
      action: string;
      entity_type: string | null;
      entity_name: string | null;
      confidence: AuditEvent["confidence"] | null;
      human_verified: boolean | null;
      created_at: string;
    }[]
  >(`audit_events?${params}`);
  return rows.map((r) => ({
    id: r.id,
    agentName: r.agent_name,
    action: r.action,
    entityType: r.entity_type ?? "—",
    entityName: r.entity_name ?? "—",
    confidence: r.confidence ?? "modelled",
    humanVerified: r.human_verified ?? false,
    timestamp: r.created_at,
  }));
}
