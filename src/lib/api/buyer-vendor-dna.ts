// Typed client for the buyer workflow's two read-only "Query" tools
// (query-published-vendor-solution-dna, query-approved-vendor-solution-dna).
// These are safe to call directly from the frontend — they have no side
// effects, unlike the workflow's Save tools, which only Yoxa's own agent
// should ever call (see buyer-lookup.ts's header comment). Same
// callFunction pattern as src/lib/api/vendor-dna.ts.

export type VerificationStatus = "verified" | "modelled" | "unverified" | "pending";
export type CapabilityCategory =
  | "product"
  | "service"
  | "solution"
  | "feature"
  | "integration"
  | "industry"
  | "consulting"
  | "use_case"
  | "constraint";

export interface PublishedEvidence {
  id?: string;
  sourceLabel: string | null;
  sourceType: string | null;
  evidenceType: string | null;
}

export interface PublishedCapability {
  id: string;
  name: string;
  description: string | null;
  category: CapabilityCategory;
  verificationStatus: VerificationStatus;
  tags: string[];
  evidence: PublishedEvidence[];
}

export interface PublishedVendor {
  vendorId: string;
  companyName: string;
  industry: string | null;
  industries: string[];
  tagline: string | null;
  description: string | null;
  capabilities: PublishedCapability[];
}

export interface QueryPublishedVendorSolutionDnaResponse {
  vendorCount: number;
  vendors: PublishedVendor[];
}

export interface ApprovedEvidence {
  id: string;
  sourceLabel: string | null;
  sourceType: string | null;
  sourceText: string | null;
  sourceLocation: string | null;
  evidenceType: string | null;
}

export interface ApprovedCapability {
  id: string;
  name: string;
  description: string | null;
  category: CapabilityCategory;
  verificationStatus: VerificationStatus;
  sourceLocation: string | null;
  tags: string[];
  evidence: ApprovedEvidence[];
}

export interface QueryApprovedVendorSolutionDnaResponse {
  vendorId: string;
  companyName: string;
  capabilityCount: number;
  capabilities: ApprovedCapability[];
}

export class BuyerVendorDnaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BuyerVendorDnaApiError";
    this.status = status;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function callFunction<T>(slug: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new BuyerVendorDnaApiError(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing).",
      503
    );
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
      method: "POST",
      // Buyers re-run this while browsing vendor cards; a stale cached
      // response would hide a vendor whose Solution DNA just got published.
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BuyerVendorDnaApiError(`Could not reach ${slug}. Check your connection and try again.`, 0);
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `${slug} failed (${res.status}).`;
    throw new BuyerVendorDnaApiError(message, res.status);
  }
  return data as T;
}

export function queryPublishedVendorSolutionDna(): Promise<QueryPublishedVendorSolutionDnaResponse> {
  return callFunction("query-published-vendor-solution-dna", {});
}

export function queryApprovedVendorSolutionDna(vendorId: string): Promise<QueryApprovedVendorSolutionDnaResponse> {
  return callFunction("query-approved-vendor-solution-dna", { vendorId });
}
