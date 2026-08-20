// Called right after a magic-link sign-in completes (src/app/auth/callback/page.tsx).
// verify_jwt: true — Supabase's edge runtime rejects the call before it even
// reaches here unless the Authorization header carries a valid user access
// token, so by the time this code runs we already know the token is genuine;
// we still need to decode *which* user it belongs to, which is what the
// getUser(token) call below is for.
//
// Resolves the caller's verified email to whichever business record(s) it's
// linked to (a buyer row, a vendor row, or platform_admin membership), and —
// only for allow-listed admin emails — auto-provisions the platform_admin
// organization_members row on first login so is_platform_admin() starts
// returning true for them from here on.
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
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const [buyerRes, vendorRes, allowlistRes] = await Promise.all([
    admin.from("buyers").select("id, company_name").eq("email", email).maybeSingle(),
    admin.from("vendors").select("id, company_name").eq("email", email).maybeSingle(),
    admin.from("admin_allowlist").select("email").eq("email", email).maybeSingle(),
  ]);

  let isAdmin = false;
  if (allowlistRes.data) {
    const { data: existingMembership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "platform_admin")
      .maybeSingle();

    if (existingMembership) {
      isAdmin = true;
    } else {
      // First login for an allow-listed admin email — find or create the one
      // shared "Platform" organization, then grant platform_admin on it.
      let platformOrgId: string | null = null;
      const { data: existingOrg } = await admin.from("organizations").select("id").eq("type", "admin").limit(1).maybeSingle();
      if (existingOrg) {
        platformOrgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgError } = await admin
          .from("organizations")
          .insert({ name: "Deck-less Pitch Platform", type: "admin" })
          .select("id")
          .single();
        if (!orgError) platformOrgId = newOrg.id;
      }
      if (platformOrgId) {
        const { error: membershipError } = await admin
          .from("organization_members")
          .insert({ user_id: userId, organization_id: platformOrgId, role: "platform_admin" });
        isAdmin = !membershipError;
      }
    }
  }

  return json({
    email,
    buyer: buyerRes.data ? { id: buyerRes.data.id, companyName: buyerRes.data.company_name } : null,
    vendor: vendorRes.data ? { id: vendorRes.data.id, companyName: vendorRes.data.company_name } : null,
    isAdmin,
  });
});
