// Marks one buyer-workflow approval request resolved and hands back its
// response_url so the caller (src/app/api/buyer-approvals/[requestId]/
// respond/route.ts) can forward the buyer's answer to Yoxa and actually
// resume the paused run. verify_jwt: false.
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
  if (!requestId) {
    return new Response(JSON.stringify({ error: "requestId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("buyer_workflow_approval_requests")
    .update({ status: "resolved", resolved_value: body.resolvedValue ?? null, resolved_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .select("request_id, response_url")
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return new Response(JSON.stringify({ error: status === 404 ? "No approval request exists for that requestId." : error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ requestId: data.request_id, responseUrl: data.response_url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
