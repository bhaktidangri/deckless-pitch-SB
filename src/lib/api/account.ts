// Calls the 5 auth-gated edge functions (resolve-account-session,
// link-buyer-account, link-vendor-account, update-buyer-profile,
// update-vendor-profile) — unlike every other edge-function call in this
// codebase (see buyer-lookup.ts, vendor-frontier.ts), these send the
// signed-in user's own access token as the Authorization header, not the
// anon key, because they're deployed with verify_jwt:true and need a real
// user identity to resolve/link/edit against.
import { getSupabaseClient } from "@/lib/supabase-client";

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

export interface UpdateBuyerProfileInput {
  companyName?: string;
  industry?: string;
  companySize?: number;
  contactName?: string;
  contactRole?: string;
}

export interface BuyerProfile {
  id: string;
  companyName: string;
  industry: string | null;
  companySize: number | null;
  contactName: string | null;
  contactRole: string | null;
  email: string | null;
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
}

// Logs the outreach for the vendor's own tracking dashboard and returns the
// buyer's contact email so the caller can open a mailto: link — this app has
// no transactional email provider wired up, so actual sending happens
// through the vendor's own email client, not a backend relay.
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
}

// Directly schedules (or reschedules, when meetingRequestId is passed) a
// meeting with a buyer — status goes straight to "scheduled" instead of
// waiting on a buyer-initiated "requested" row. Returns everything needed to
// build a calendar invite (.ics) and a mailto: link client-side.
export function scheduleMeetingDirect(input: ScheduleMeetingInput): Promise<ScheduledMeeting> {
  return callAuthedFunction<ScheduledMeeting>("schedule-meeting-direct", input);
}
