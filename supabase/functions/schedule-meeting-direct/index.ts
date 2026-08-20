// Lets a vendor directly schedule (or reschedule) a meeting with a buyer,
// instead of only being able to confirm a buyer-initiated 'requested' row
// (see confirm-vendor-discussion-meeting). Writes status='scheduled' plus
// title/notes/duration/meeting_link straight away and, when SENDGRID_API_KEY
// is configured, sends the buyer a real invite email with a .ics attachment
// via SendGrid — tracked on the same row via the invite_email_* columns from
// the email_delivery_tracking migration. Falls back to leaving
// invite_email_status "not_sent" (no API key yet) so the frontend's
// mailto:/downloadIcs fallback still has somewhere to land. Caller must be
// the authenticated vendor (verified by email), mirroring
// record-vendor-outreach.
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

// Ports src/lib/ics.ts's buildIcsContent verbatim (Deno can't import
// browser-oriented app source directly) — keep the two in sync if the
// .ics shape ever changes.
function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function buildIcsContent(event: {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startIso: string;
  durationMinutes: number;
  organizerEmail?: string | null;
  attendeeEmail?: string | null;
}): string {
  const start = toIcsDate(event.startIso);
  const end = toIcsDate(new Date(new Date(event.startIso).getTime() + event.durationMinutes * 60 * 1000).toISOString());
  const stamp = toIcsDate(new Date(event.startIso).toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deckless Pitch//Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.organizerEmail) lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  if (event.attendeeEmail) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${event.attendeeEmail}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

// UTF-8-safe base64 — SendGrid attachments require base64 `content`.
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
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
async function sendInviteViaSendGrid(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  icsContent: string;
  icsFilename: string;
  trackingId: string;
}): Promise<SendGridResult> {
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
        attachments: [{ filename: opts.icsFilename, content: toBase64(opts.icsContent), type: "text/calendar", disposition: "attachment" }],
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
  const meetingRequestId = body.meetingRequestId as string | undefined;
  const proposedDate = typeof body.proposedDate === "string" ? body.proposedDate : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const meetingLink = typeof body.meetingLink === "string" ? body.meetingLink.trim() : "";
  const durationMinutes = typeof body.durationMinutes === "number" && body.durationMinutes > 0 ? Math.round(body.durationMinutes) : 30;
  if (!buyerId) return json({ error: "buyerId is required." }, 400);
  if (!proposedDate || Number.isNaN(new Date(proposedDate).getTime())) return json({ error: "A valid proposedDate is required." }, 400);
  if (!title) return json({ error: "title is required." }, 400);

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

  const row: Record<string, unknown> = {
    buyer_id: buyer.id,
    vendor_id: vendor.id,
    status: "scheduled",
    proposed_date: proposedDate,
    title,
    notes: notes || null,
    meeting_link: meetingLink || null,
    duration_minutes: durationMinutes,
    scheduled_by_email: email,
    confirmed_at: new Date().toISOString(),
  };

  let meeting: Record<string, unknown>;
  if (meetingRequestId) {
    const { data: existing, error: existingError } = await admin
      .from("meeting_requests")
      .select("id, vendor_id")
      .eq("id", meetingRequestId)
      .maybeSingle();
    if (existingError || !existing) return json({ error: "Meeting not found." }, 404);
    if (existing.vendor_id !== vendor.id) return json({ error: "This meeting belongs to a different vendor." }, 403);
    const { data, error } = await admin.from("meeting_requests").update(row).eq("id", meetingRequestId).select("*").single();
    if (error) return json({ error: error.message }, 500);
    meeting = data;
  } else {
    const { data, error } = await admin.from("meeting_requests").insert(row).select("*").single();
    if (error) return json({ error: error.message }, 500);
    meeting = data;
  }

  let inviteStatus: "not_sent" | "sent" | "failed" | "skipped_no_email" = "skipped_no_email";
  let inviteProviderId: string | null = null;
  let inviteError: string | null = null;

  if (buyer.email) {
    const when = new Date(proposedDate).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
    const textLines = [
      `Hi ${buyer.contact_name ?? buyer.company_name} team,`,
      "",
      `We've scheduled a meeting: ${title}`,
      `When: ${when} (${durationMinutes} min)`,
      meetingLink ? `Join: ${meetingLink}` : "",
      notes ? `\n${notes}` : "",
      "",
      `A calendar invite is attached — accept it to add this to your calendar.`,
      "",
      `— ${vendor.company_name}`,
    ].filter(Boolean);
    const html = `<p>Hi ${escapeHtml(String(buyer.contact_name ?? buyer.company_name))} team,</p>
<p>We've scheduled a meeting: <strong>${escapeHtml(title)}</strong></p>
<p>When: ${escapeHtml(when)} (${durationMinutes} min)${meetingLink ? `<br>Join: <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a>` : ""}</p>
${notes ? `<p>${escapeHtml(notes).replace(/\n/g, "<br>")}</p>` : ""}
<p>A calendar invite is attached — accept it to add this to your calendar.</p>
<p style="color:#888;font-size:12px;margin-top:24px;">Sent via Deckless Pitch on behalf of ${escapeHtml(vendor.company_name as string)}.</p>`;

    const icsContent = buildIcsContent({
      uid: `${meeting.id}@deckless-pitch`,
      title,
      description: notes || undefined,
      location: meetingLink || undefined,
      startIso: proposedDate,
      durationMinutes,
      organizerEmail: vendor.email,
      attendeeEmail: buyer.email,
    });

    const result = await sendInviteViaSendGrid({
      to: buyer.email,
      subject: title,
      text: textLines.join("\n"),
      html,
      icsContent,
      icsFilename: `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "meeting"}.ics`,
      trackingId: crypto.randomUUID(),
    });
    if (result.error === "SENDGRID_API_KEY is not configured." || result.error === "SENDGRID_FROM_EMAIL is not configured.") {
      inviteStatus = "not_sent";
    } else {
      inviteStatus = result.status;
      inviteProviderId = result.providerId;
      inviteError = result.error;
    }
  }

  const { data: updated, error: trackingUpdateError } = await admin
    .from("meeting_requests")
    .update({
      invite_email_status: inviteStatus,
      invite_email_provider_id: inviteProviderId,
      invite_email_error: inviteError,
    })
    .eq("id", meeting.id)
    .select("*")
    .single();
  if (!trackingUpdateError && updated) meeting = updated;

  return json({
    meetingRequestId: meeting.id,
    status: meeting.status,
    proposedDate: meeting.proposed_date,
    title: meeting.title,
    notes: meeting.notes,
    meetingLink: meeting.meeting_link,
    durationMinutes: meeting.duration_minutes,
    buyerEmail: buyer.email,
    buyerContactName: buyer.contact_name,
    buyerCompanyName: buyer.company_name,
    vendorCompanyName: vendor.company_name,
    inviteEmailStatus: meeting.invite_email_status,
    inviteEmailError: meeting.invite_email_error,
  });
});
