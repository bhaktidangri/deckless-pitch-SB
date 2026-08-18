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
