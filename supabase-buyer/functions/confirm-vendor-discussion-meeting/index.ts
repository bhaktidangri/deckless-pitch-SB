// Vendor confirms a MeetingRequest — PRD §7.7 / §9's "Confirm Vendor
// Discussion Meeting", same status as resolve-capability-frontier-item:
// named as the vendor-side counterpart but never modeled or built. Moves
// status to 'scheduled'. verify_jwt: false.
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

  const meetingRequestId = body.meetingRequestId as string | undefined;
  if (!meetingRequestId) {
    return new Response(JSON.stringify({ error: "meetingRequestId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const update: Record<string, unknown> = { status: "scheduled", confirmed_at: new Date().toISOString() };
  if (body.confirmedDate) update.proposed_date = body.confirmedDate;

  const { data, error } = await supabase
    .from("meeting_requests")
    .update(update)
    .eq("id", meetingRequestId)
    .select("id, status, proposed_date")
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return new Response(JSON.stringify({ error: status === 404 ? "No meeting request exists for that id." : error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ meetingRequestId: data.id, status: data.status, proposedDate: data.proposed_date }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
