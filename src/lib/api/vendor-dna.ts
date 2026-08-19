// Typed client for the three real vendor-DNA persistence edge functions
// (see the workflow's OpenAPI specs and PRD Section 7). These are Milestone
// 1's "Save Vendor Solution DNA Draft" and Milestone 2's "Query Draft Vendor
// Capabilities" / "Publish Approved Vendor Solution DNA" tools — the only
// three currently-simulated tools now wired to a real backend.

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
export type EvidenceSourceType = "website" | "pdf" | "ppt" | "doc" | "spreadsheet" | "manual" | "other";

export interface DraftEvidenceInput {
  sourceLabel?: string;
  sourceType?: EvidenceSourceType;
  sourceText: string;
  sourceLocation?: string;
  evidenceType?: string;
}

export interface DraftCapabilityInput {
  name: string;
  description?: string;
  category: CapabilityCategory;
  verificationStatus: VerificationStatus;
  sourceId?: string;
  sourceLocation?: string;
  tags?: string[];
  evidence?: DraftEvidenceInput[];
}

export interface SavedEvidence {
  id: string | null;
  sourceLabel: string | null;
  sourceType: EvidenceSourceType | null;
  sourceText: string | null;
  sourceLocation: string | null;
  evidenceType: string | null;
}

export interface SavedCapability {
  id: string;
  name: string;
  description: string | null;
  category: CapabilityCategory;
  verificationStatus: VerificationStatus;
  sourceLocation: string | null;
  tags: string[];
  evidence: SavedEvidence[];
}

export interface SaveVendorSolutionDnaDraftRequest {
  vendor: {
    id?: string;
    companyName: string;
    website?: string;
    industry?: string;
    description?: string;
  };
  capabilities: DraftCapabilityInput[];
}

export interface SaveVendorSolutionDnaDraftResponse {
  vendor: { id: string; created: boolean };
  savedCapabilityIds: string[];
  capabilities: SavedCapability[];
  capabilityCount: number;
  evidenceCount: number;
  savedAt: string;
}

export interface QueryDraftVendorCapabilitiesResponse {
  vendorId: string;
  companyName: string;
  capabilityCount: number;
  capabilities: SavedCapability[];
}

export interface ApprovalDecision {
  capabilityId: string;
  verificationStatus: VerificationStatus;
  description?: string;
  decidedAt: string;
}

export interface PublishApprovedVendorSolutionDnaResponse {
  vendorId: string;
  publishedCapabilityIds: string[];
  unpublishedCapabilityIds: string[];
  vendorVerificationStatus: VerificationStatus | null;
  publishedAt: string;
}

export class VendorDnaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "VendorDnaApiError";
    this.status = status;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function callFunction<T>(slug: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new VendorDnaApiError(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing).",
      503
    );
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new VendorDnaApiError(`Could not reach ${slug}. Check your connection and try again.`, 0);
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `${slug} failed (${res.status}).`;
    throw new VendorDnaApiError(message, res.status);
  }
  return data as T;
}

export function saveVendorSolutionDnaDraft(
  req: SaveVendorSolutionDnaDraftRequest
): Promise<SaveVendorSolutionDnaDraftResponse> {
  return callFunction("save-vendor-solution-dna-draft", req);
}

export function queryDraftVendorCapabilities(vendorId: string): Promise<QueryDraftVendorCapabilitiesResponse> {
  return callFunction("query-draft-vendor-capabilities", { vendorId });
}

export function publishApprovedVendorSolutionDna(
  vendorId: string,
  decisions: ApprovalDecision[]
): Promise<PublishApprovedVendorSolutionDnaResponse> {
  return callFunction("publish-approved-vendor-solution-dna", { vendorId, decisions });
}
