// Semantic search over every published vendor's capabilities — calls
// search-vendor-capabilities (pgvector cosine similarity against the
// Supabase Edge Runtime's built-in gte-small embedding model, no external
// API key). Read-only, safe to call straight from the browser with the anon
// key like every other lookup in this codebase.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface CapabilitySearchResult {
  capabilityId: string;
  vendorId: string;
  vendorCompanyName: string;
  name: string;
  description: string | null;
  category: string;
  verificationStatus: string;
  tags: string[];
  /** Cosine similarity, 0-1 — how well this capability matches the query's meaning, not just its wording. */
  similarity: number;
}

export async function searchVendorCapabilities(query: string, limit = 20): Promise<CapabilitySearchResult[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-vendor-capabilities`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ query: trimmed, limit }),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { results?: CapabilitySearchResult[] };
  return data.results ?? [];
}
