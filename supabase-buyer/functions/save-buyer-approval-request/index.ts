// Persists (or, on a retried webhook push, updates) one pending buyer-
// workflow human_approval pause. Called by
// src/app/api/webhooks/yoxa-buyer-hitl/route.ts. verify_jwt: false, same as
// every other function in this project.
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

  const requestId = body.requestId as string | undefined;
  const workflowRunId = body.workflowRunId as string | undefined;
  if (!requestId || !workflowRunId) {
    return new Response(JSON.stringify({ error: "requestId and workflowRunId are required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("buyer_workflow_approval_requests")
    .upsert(
      {
        request_id: requestId,
        workflow_run_id: workflowRunId,
        buyer_id: (body.buyerId as string | undefined) ?? null,
        node_key: (body.nodeKey as string | undefined) ?? "unknown",
        title: (body.title as string | undefined) ?? null,
        description: (body.description as string | undefined) ?? null,
        options: body.options ?? [],
        response_url: (body.responseUrl as string | undefined) ?? null,
        status: "pending",
        raw_payload: body.rawPayload ?? body,
      },
      { onConflict: "request_id" }
    )
    .select("id, request_id, status")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: data.id, requestId: data.request_id, status: data.status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
