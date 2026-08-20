// Lets a logged-in buyer edit their own profile fields. Resolves "which
// buyer row" purely from the verified token's email — never from a
// client-supplied buyerId — so a caller can only ever edit their own
// linked record, not someone else's by guessing an id.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGAGEMENT_STATUSES = ["pending", "in_progress", "closed"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server is not configured." }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing bearer token." }, 401);

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user?.email) return json({ error: "Could not verify session." }, 401);
  const email = userData.user.email.toLowerCase();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: buyer, error: buyerError } = await admin.from("buyers").select("id").eq("email", email).maybeSingle();
  if (buyerError || !buyer) return json({ error: "No buyer profile linked to this account yet." }, 404);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.companyName === "string" && body.companyName.trim()) patch.company_name = body.companyName.trim();
  if (typeof body.industry === "string") patch.industry = body.industry.trim() || null;
  if (typeof body.companySize === "number" && Number.isFinite(body.companySize)) patch.company_size = body.companySize;
  if (typeof body.contactName === "string") patch.contact_name = body.contactName.trim() || null;
  if (typeof body.contactRole === "string") patch.contact_role = body.contactRole.trim() || null;
  if (typeof body.engagementStatus === "string") {
    if (!ENGAGEMENT_STATUSES.includes(body.engagementStatus)) {
      return json({ error: `engagementStatus must be one of: ${ENGAGEMENT_STATUSES.join(", ")}.` }, 400);
    }
    patch.engagement_status = body.engagementStatus;
  }

  const { data, error } = await admin
    .from("buyers")
    .update(patch)
    .eq("id", buyer.id)
    .select("id, company_name, industry, company_size, contact_name, contact_role, email, engagement_status")
    .single();
  if (error) return json({ error: error.message }, 500);

  return json({
    id: data.id,
    companyName: data.company_name,
    industry: data.industry,
    companySize: data.company_size,
    contactName: data.contact_name,
    contactRole: data.contact_role,
    email: data.email,
    engagementStatus: data.engagement_status,
  });
});
