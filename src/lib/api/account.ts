// Calls the 5 auth-gated edge functions (resolve-account-session,
// link-buyer-account, link-vendor-account, update-buyer-profile,
// update-vendor-profile) — unlike every other edge-function call in this
// codebase (see buyer-lookup.ts, vendor-frontier.ts), these send the
// signed-in user's own access token as the Authorization header, not the
// anon key, because they're deployed with verify_jwt:true and need a real
// user identity to resolve/link/edit against.
import { getSupabaseClient } from "@/lib/supabase-client";
import type { EmailDeliveryStatus } from "@/lib/api/vendor-lookup";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function callAuthedFunction<T>(slug: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL) throw new Error("Supabase is not configured.");
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `${slug} failed (${res.status}).`);
  return data as T;
}

export interface ResolvedAccountSession {
  email: string;
  buyer: { id: string; companyName: string } | null;
  vendor: { id: string; companyName: string } | null;
  isAdmin: boolean;
}

export function resolveAccountSession(): Promise<ResolvedAccountSession> {
  return callAuthedFunction<ResolvedAccountSession>("resolve-account-session", {});
}

export function linkBuyerAccount(buyerId: string): Promise<{ linked: boolean; alreadyLinked: boolean }> {
  return callAuthedFunction("link-buyer-account", { buyerId });
}

export function linkVendorAccount(vendorId: string): Promise<{ linked: boolean; alreadyLinked: boolean }> {
  return callAuthedFunction("link-vendor-account", { vendorId });
}

// The buyer's own deal-status control — 'pending' (default, open to vendor
// outreach), 'in_progress' (actively evaluating a vendor), 'closed' (deal
// done). Enforced server-side: record-vendor-outreach and
// schedule-meeting-direct both reject with 403 once a buyer is 'closed', so
// this isn't just a display label.
export type BuyerEngagementStatus = "pending" | "in_progress" | "closed";

export interface UpdateBuyerProfileInput {
  companyName?: string;
  industry?: string;
  companySize?: number;
  contactName?: string;
  contactRole?: string;
  engagementStatus?: BuyerEngagementStatus;
}

export interface BuyerProfile {
  id: string;
  companyName: string;
  industry: string | null;
  companySize: number | null;
  contactName: string | null;
  contactRole: string | null;
  email: string | null;
  engagementStatus: BuyerEngagementStatus;
}

export function updateBuyerProfile(input: UpdateBuyerProfileInput): Promise<BuyerProfile> {
  return callAuthedFunction<BuyerProfile>("update-buyer-profile", input);
}

export interface UpdateVendorProfileInput {
  companyName?: string;
  industry?: string;
  industries?: string[];
  website?: string;
  tagline?: string;
  description?: string;
  employeeRange?: string;
  hq?: string;
  foundedYear?: number;
}

export interface VendorProfile {
  id: string;
  companyName: string;
  industry: string | null;
  industries: string[];
  website: string | null;
  tagline: string | null;
  description: string | null;
  employeeRange: string | null;
  hq: string | null;
  foundedYear: number | null;
  verificationStatus: string;
  email: string | null;
}

export function updateVendorProfile(input: UpdateVendorProfileInput): Promise<VendorProfile> {
  return callAuthedFunction<VendorProfile>("update-vendor-profile", input);
}

export interface RecordVendorOutreachInput {
  buyerId: string;
  subject: string;
  message: string;
}

export interface RecordedVendorOutreach {
  logged: boolean;
  id: string;
  createdAt: string;
  buyerEmail: string | null;
  buyerContactName: string | null;
  vendorCompanyName: string;
  emailStatus: EmailDeliveryStatus;
  emailProviderId: string | null;
  emailError: string | null;
}

// Logs the outreach for the vendor's own tracking dashboard and, when
// SENDGRID_API_KEY is configured server-side, actually sends it via SendGrid —
// emailStatus tells the caller whether that really happened ("sent"),
// wasn't attempted yet ("not_sent" — no provider configured), failed, or
// was skipped because this buyer has no email on file. buyerEmail is still
// returned either way so a mailto: fallback stays available when it wasn't
// really sent.
export function recordVendorOutreach(input: RecordVendorOutreachInput): Promise<RecordedVendorOutreach> {
  return callAuthedFunction<RecordedVendorOutreach>("record-vendor-outreach", input);
}

export interface ScheduleMeetingInput {
  buyerId: string;
  meetingRequestId?: string;
  title: string;
  proposedDate: string;
  durationMinutes?: number;
  meetingLink?: string;
  notes?: string;
}

export interface ScheduledMeeting {
  meetingRequestId: string;
  status: string;
  proposedDate: string;
  title: string | null;
  notes: string | null;
  meetingLink: string | null;
  durationMinutes: number;
  buyerEmail: string | null;
  buyerContactName: string | null;
  buyerCompanyName: string;
  vendorCompanyName: string;
  inviteEmailStatus: EmailDeliveryStatus;
  inviteEmailError: string | null;
}

// Directly schedules (or reschedules, when meetingRequestId is passed) a
// meeting with a buyer — status goes straight to "scheduled" instead of
// waiting on a buyer-initiated "requested" row. When SENDGRID_API_KEY is
// configured server-side, also sends the buyer a real invite email with a
// .ics attachment (inviteEmailStatus: "sent"); either way still returns
// everything needed to build a calendar invite and a mailto: link
// client-side as a fallback.
export function scheduleMeetingDirect(input: ScheduleMeetingInput): Promise<ScheduledMeeting> {
  return callAuthedFunction<ScheduledMeeting>("schedule-meeting-direct", input);
}

// ---- reverse direction: buyer -> vendor (from /buyer/chat) ---------------

export interface RecordBuyerOutreachInput {
  vendorId: string;
  subject: string;
  message: string;
}

export interface RecordedBuyerOutreach {
  logged: boolean;
  id: string;
  createdAt: string;
  vendorEmail: string | null;
  vendorCompanyName: string;
  buyerCompanyName: string;
  emailStatus: EmailDeliveryStatus;
  emailProviderId: string | null;
  emailError: string | null;
}

// Mirrors recordVendorOutreach but buyer-initiated — lets a buyer email a
// particular vendor directly from Ask AI instead of only ever being
// contacted by vendors. Logs to buyer_outreach_events (kept separate from
// vendor_outreach_events so the vendor dashboard's "Outreach sent" stat
// isn't corrupted by outreach it didn't send) and, when SENDGRID_API_KEY is
// configured server-side, actually sends it via SendGrid.
export function recordBuyerOutreach(input: RecordBuyerOutreachInput): Promise<RecordedBuyerOutreach> {
  return callAuthedFunction<RecordedBuyerOutreach>("record-buyer-outreach", input);
}

export interface ScheduleMeetingWithVendorInput {
  vendorId: string;
  meetingRequestId?: string;
  title: string;
  proposedDate: string;
  durationMinutes?: number;
  meetingLink?: string;
  notes?: string;
}

export interface ScheduledMeetingWithVendor {
  meetingRequestId: string;
  status: string;
  proposedDate: string;
  title: string | null;
  notes: string | null;
  meetingLink: string | null;
  durationMinutes: number;
  vendorEmail: string | null;
  vendorCompanyName: string;
  buyerCompanyName: string;
  inviteEmailStatus: EmailDeliveryStatus;
  inviteEmailError: string | null;
}

// Mirrors scheduleMeetingDirect but buyer-initiated — lets a buyer directly
// schedule (or reschedule) a meeting with a particular vendor from Ask AI.
export function scheduleMeetingWithVendor(input: ScheduleMeetingWithVendorInput): Promise<ScheduledMeetingWithVendor> {
  return callAuthedFunction<ScheduledMeetingWithVendor>("buyer-schedule-meeting", input);
}
