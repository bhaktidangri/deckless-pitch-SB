// Reads the vendor-facing knowledge PPTX generated automatically by the
// "Generate and Upload Vendor Knowledge PPTX" Output Tool (Milestone 2 —
// runs right after publish, no human approval step). Direct public read
// against Supabase, same pattern as vendor-lookup.ts and
// findPendingApprovalForCapability's old approach — no auth on this
// hackathon build.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface VendorKnowledgeDocument {
  id: string;
  vendorId: string;
  title: string | null;
  pptxUrl: string | null;
  status: "ready" | "failed";
  indexedSections: unknown[];
  createdAt: string;
}

export async function getVendorKnowledgeDocument(vendorId: string): Promise<VendorKnowledgeDocument | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const params = new URLSearchParams({
    select: "id,vendor_id,title,pptx_url,status,indexed_sections,created_at",
    vendor_id: `eq.${vendorId}`,
    order: "created_at.desc",
    limit: "1",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vendor_knowledge_documents?${params}`, {
    cache: "no-store",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as {
    id: string;
    vendor_id: string;
    title: string | null;
    pptx_url: string | null;
    status: "ready" | "failed";
    indexed_sections: unknown[];
    created_at: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    title: row.title,
    pptxUrl: row.pptx_url,
    status: row.status,
    indexedSections: row.indexed_sections ?? [],
    createdAt: row.created_at,
  };
}
