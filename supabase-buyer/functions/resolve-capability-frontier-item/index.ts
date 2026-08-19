// Vendor answers a CapabilityFrontierItem — PRD §7.7 / §9's "Resolve
// Capability Frontier Item", explicitly named as the vendor-side workflow's
// counterpart tool but "not modeled in this workflow" and confirmed unbuilt
// anywhere (grepped the vendor-side PRD too). Moves status out of
// vendor_review. verify_jwt: false.
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

  const frontierItemId = body.frontierItemId as string | undefined;
  const vendorResponse = body.vendorResponse as string | undefined;
  if (!frontierItemId || !vendorResponse) {
    return new Response(JSON.stringify({ error: "frontierItemId and vendorResponse are required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("capability_frontier")
    .update({
      status: (body.status as string | undefined) ?? "resolved",
      vendor_response: vendorResponse,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", frontierItemId)
    .select("id, status, vendor_response")
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return new Response(JSON.stringify({ error: status === 404 ? "No frontier item exists for that id." : error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ frontierItemId: data.id, status: data.status, vendorResponse: data.vendor_response }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
