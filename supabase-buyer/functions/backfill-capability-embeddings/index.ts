// Computes embeddings for any published solution_capabilities rows that
// don't have one yet, using the embedding model built into the Supabase
// Edge Runtime (Supabase.ai.Session("gte-small"), 384 dimensions) — no
// external embedding API or key needed. Purely additive: doesn't touch how
// the Yoxa agent writes solution_capabilities (save-vendor-solution-dna-
// draft / publish-approved-vendor-solution-dna), just backfills a column
// those tools don't know about. Called lazily by search-vendor-capabilities
// right before it searches (bounded to a small batch), so results stay
// fresh without needing a cron job — this project has no scheduled-task
// infra to hang one off of.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function embeddingInput(row: { name: string; description: string | null; category: string; tags: string[] | null }): string {
  return [row.name, row.description, row.category, ...(row.tags ?? [])].filter(Boolean).join(" — ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 503);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — batchSize just falls back to the default
  }
  // Capped low — a batch of 30 sequential model.run() calls hit the edge
  // function's WORKER_RESOURCE_LIMIT in practice, observed live against
  // this project. Call repeatedly (search-vendor-capabilities does, once
  // per search) rather than raising this.
  const batchSize = typeof body.batchSize === "number" && body.batchSize > 0 ? Math.min(body.batchSize, 15) : 10;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: rows, error: selectError } = await admin
    .from("solution_capabilities")
    .select("id, name, description, category, tags")
    .is("embedding", null)
    .in("verification_status", ["verified", "modelled"])
    .limit(batchSize);
  if (selectError) return json({ error: selectError.message }, 500);
  if (!rows || rows.length === 0) return json({ embedded: 0 });

  // @ts-expect-error Supabase.ai is a Supabase Edge Runtime global, not part of standard Deno/TS lib types.
  const model = new Supabase.ai.Session("gte-small");

  let embedded = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      const embedding = (await model.run(embeddingInput(row), { mean_pool: true, normalize: true })) as number[];
      const { error: updateError } = await admin.from("solution_capabilities").update({ embedding }).eq("id", row.id);
      if (updateError) errors.push(`${row.id}: ${updateError.message}`);
      else embedded += 1;
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : "embedding failed"}`);
    }
  }

  return json({ embedded, remaining: rows.length - embedded, errors: errors.length > 0 ? errors : undefined });
});
