// Persists one buyer-facing .pptx deck delivery from Step 6's "Generate
// Solution Pitch Deck" Output Tool (and, per PRD §7.4, potentially a
// regenerated deck after a What-If Scenarios change — same table, newest
// row wins). Called by src/app/api/webhooks/yoxa-buyer-deck/route.ts.
// verify_jwt: false, mirrors save-vendor-knowledge-document.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server storage is not configured." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "The request body was not valid JSON." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buyerId = body.buyerId as string | undefined;
  if (!buyerId) {
    return new Response(JSON.stringify({ error: "buyerId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("buyer_solution_decks")
    .insert({
      buyer_id: buyerId,
      vendor_id: (body.vendorId as string | undefined) ?? null,
      solution_model_id: (body.solutionModelId as string | undefined) ?? null,
      workflow_run_id: (body.workflowRunId as string | undefined) ?? null,
      title: (body.title as string | undefined) ?? "Solution Pitch Deck",
      pptx_url: (body.fileUrl as string | undefined) ?? null,
      status: body.fileUrl ? "ready" : "failed",
      raw_payload: body.rawPayload ?? body,
    })
    .select("id, buyer_id, pptx_url, status")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: data.id, buyerId: data.buyer_id, pptxUrl: data.pptx_url, status: data.status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
