// Upserts one row of buyer_workflow_runs by workflow_run_id. Two very
// different callers hit this, both fine with the same lenient contract:
//   1. src/app/api/buyer-requirement-submission/route.ts, right after a
//      trigger succeeds — creates the row, buyerId often still unknown.
//   2. src/app/buyer/discover/page.tsx, once it resolves its own buyerId
//      (either immediately, for a returning buyer, or after polling for a
//      new one) — backfills buyer_id onto the row created in (1).
//   3. The scheduled Yoxa-sync task (see the "yoxa-buyer-run-sync"
//      scheduled task) — updates status/completed_at/raw_status once it
//      observes a run finish on Yoxa's dashboard, and deck_synced_at once
//      it's pushed a generated deck into save-buyer-solution-deck.
// verify_jwt: false, same as every other function in this project.
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

  const workflowRunId = body.workflowRunId as string | undefined;
  if (!workflowRunId) {
    return new Response(JSON.stringify({ error: "workflowRunId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const buyerId = body.buyerId as string | undefined;
  const status = body.status as string | undefined;
  const markCompleted = status === "completed" || status === "failed";
  const deckSynced = body.deckSynced === true;

  // Read-modify-write rather than a single upsert: buyerId/status here are
  // "set if provided, otherwise leave whatever's already on the row alone"
  // — an upsert with nulls would clobber a buyerId the trigger route
  // already set once the discover-page backfill call runs, or clobber a
  // status the sync task already advanced to "completed" if a stale
  // "running" call raced in after it.
  const { data: existing } = await supabase
    .from("buyer_workflow_runs")
    .select("id, buyer_id, status, deck_synced_at")
    .eq("workflow_run_id", workflowRunId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    last_checked_at: new Date().toISOString(),
  };
  if (buyerId) patch.buyer_id = buyerId;
  if (status) patch.status = status;
  if (markCompleted) patch.completed_at = new Date().toISOString();
  if (deckSynced) patch.deck_synced_at = new Date().toISOString();
  if (body.rawStatus) patch.raw_status = body.rawStatus;

  let result;
  if (existing) {
    result = await supabase
      .from("buyer_workflow_runs")
      .update(patch)
      .eq("id", existing.id)
      .select("id, workflow_run_id, buyer_id, status, deck_synced_at, completed_at")
      .single();
  } else {
    result = await supabase
      .from("buyer_workflow_runs")
      .insert({ workflow_run_id: workflowRunId, ...patch })
      .select("id, workflow_run_id, buyer_id, status, deck_synced_at, completed_at")
      .single();
  }

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
