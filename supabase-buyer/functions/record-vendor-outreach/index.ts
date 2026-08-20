// Logs a vendor's outreach to a buyer (subject/message) for the vendor's own
// CRM-style tracking dashboard, and — when SENDGRID_API_KEY is configured —
// actually sends it via SendGrid, tracking delivery/open/click state on the
// row itself (see the email_status/opened_at/clicked_at columns from the
// email_delivery_tracking migration). Falls back to leaving email_status
// "not_sent" if no API key is configured yet, or "skipped_no_email" if the
// buyer has no email on file — callers (EmailBuyerCard) still get
// buyerEmail back either way so a mailto: fallback stays available. Caller
// must be the authenticated vendor (verified by email, never a
// client-supplied id), mirroring link-vendor-account / update-vendor-profile.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface SendGridResult {
  status: "sent" | "failed";
  providerId: string | null;
  error: string | null;
}

// SendGrid's /mail/send returns 202 with no body, so there's no message id
// to key off of the way Resend's response gave one. Instead we mint our own
// tracking id up front and pass it through as a custom_args entry, which
// SendGrid echoes back verbatim on every delivery/open/click webhook event
// for this message — see record-email-delivery-event, which matches on it.
async function sendViaSendGrid(opts: { to: string; subject: string; text: string; html: string; trackingId: string }): Promise<SendGridResult> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) return { status: "failed", providerId: null, error: "SENDGRID_API_KEY is not configured." };
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!fromEmail) return { status: "failed", providerId: null, error: "SENDGRID_FROM_EMAIL is not configured." };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }], custom_args: { tracking_id: opts.trackingId } }],
        from: { email: fromEmail, name: "Deckless Pitch" },
        subject: opts.subject,
        content: [
          { type: "text/plain", value: opts.text },
          { type: "text/html", value: opts.html },
        ],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      const errors = (data.errors as Array<{ message?: string }> | undefined)?.map((e) => e.message).filter(Boolean);
      return { status: "failed", providerId: null, error: errors?.length ? errors.join("; ") : `SendGrid responded ${res.status}.` };
    }
    return { status: "sent", providerId: opts.trackingId, error: null };
  } catch (err) {
    return { status: "failed", providerId: null, error: err instanceof Error ? err.message : "Network error calling SendGrid." };
  }
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
  const buyerId = body.buyerId as string | undefined;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!buyerId) return json({ error: "buyerId is required." }, 400);
  if (!subject || !message) return json({ error: "subject and message are required." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .select("id, email, company_name")
    .eq("email", email)
    .maybeSingle();
  if (vendorError || !vendor) return json({ error: "No vendor account is linked to this login yet." }, 403);

  const { data: buyer, error: buyerError } = await admin
    .from("buyers")
    .select("id, email, contact_name, company_name")
    .eq("id", buyerId)
    .maybeSingle();
  if (buyerError || !buyer) return json({ error: "Buyer not found." }, 404);

  let emailStatus: "not_sent" | "sent" | "failed" | "skipped_no_email" = "skipped_no_email";
  let emailProviderId: string | null = null;
  let emailError: string | null = null;

  if (buyer.email) {
    const html = `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p style="color:#888;font-size:12px;margin-top:24px;">Sent via Deckless Pitch on behalf of ${escapeHtml(vendor.company_name)}.</p>`;
    const trackingId = crypto.randomUUID();
    const result = await sendViaSendGrid({ to: buyer.email, subject, text: message, html, trackingId });
    if (result.error === "SENDGRID_API_KEY is not configured." || result.error === "SENDGRID_FROM_EMAIL is not configured.") {
      emailStatus = "not_sent";
    } else {
      emailStatus = result.status;
      emailProviderId = result.providerId;
      emailError = result.error;
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("vendor_outreach_events")
    .insert({
      vendor_id: vendor.id,
      buyer_id: buyer.id,
      channel: "email",
      subject,
      message,
      contact_email: buyer.email,
      sent_by_email: email,
      email_status: emailStatus,
      email_provider_id: emailProviderId,
      email_error: emailError,
    })
    .select("id, created_at, email_status, email_provider_id, email_error")
    .single();
  if (insertError) return json({ error: insertError.message }, 500);

  return json({
    logged: true,
    id: inserted.id,
    createdAt: inserted.created_at,
    buyerEmail: buyer.email,
    buyerContactName: buyer.contact_name,
    vendorCompanyName: vendor.company_name,
    emailStatus: inserted.email_status,
    emailProviderId: inserted.email_provider_id,
    emailError: inserted.email_error,
  });
});
