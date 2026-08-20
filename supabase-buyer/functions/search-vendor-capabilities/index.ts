// Semantic search over every published vendor's solution_capabilities —
// "who can do X" across the whole catalog, not just substring matching on
// name/description/tags (see GlobalCapabilitySearch, which blends this
// in). Embeds the query with the same built-in gte-small model
// backfill-capability-embeddings uses, then ranks capabilities by cosine
// similarity via the match_solution_capabilities SQL function. Backfills
// any capabilities missing an embedding first (bounded, best-effort) so
// newly-published capabilities show up without waiting on a cron this
// project doesn't have.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "query is required." }, 400);
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 50) : 20;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Best-effort, bounded backfill — never block/fail the search over it.
  try {
    await admin.functions.invoke("backfill-capability-embeddings", { body: { batchSize: 10 } });
  } catch {
    // fine — whatever already has an embedding still gets searched
  }

  // @ts-expect-error Supabase.ai is a Supabase Edge Runtime global, not part of standard Deno/TS lib types.
  const model = new Supabase.ai.Session("gte-small");
  const queryEmbedding = (await model.run(query, { mean_pool: true, normalize: true })) as number[];

  const { data: matches, error: matchError } = await admin.rpc("match_solution_capabilities", {
    query_embedding: queryEmbedding,
    match_count: limit,
    min_similarity: 0.3,
  });
  if (matchError) return json({ error: matchError.message }, 500);

  const vendorIds = Array.from(new Set((matches ?? []).map((m: { vendor_id: string }) => m.vendor_id)));
  const { data: vendors } = vendorIds.length
    ? await admin.from("vendors").select("id, company_name").in("id", vendorIds)
    : { data: [] };
  const vendorNameById = new Map((vendors ?? []).map((v: { id: string; company_name: string }) => [v.id, v.company_name]));

  const results = (matches ?? []).map((m: Record<string, unknown>) => ({
    capabilityId: m.id,
    vendorId: m.vendor_id,
    vendorCompanyName: vendorNameById.get(m.vendor_id as string) ?? "Unknown vendor",
    name: m.name,
    description: m.description,
    category: m.category,
    verificationStatus: m.verification_status,
    tags: m.tags ?? [],
    similarity: m.similarity,
  }));

  return json({ query, results });
});
