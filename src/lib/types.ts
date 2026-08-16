export type VerificationStatus = "verified" | "modelled" | "unverified" | "pending";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
export type SourceType = "website" | "pdf" | "ppt" | "doc" | "spreadsheet" | "manual" | "other";
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
export type MatchStatus = "strong_match" | "partial_match" | "unmatched" | "requires_validation";
export type FrontierStatus = "open" | "vendor_review" | "vendor_answered" | "resolved" | "closed";
export type ResponseStatus = "verified" | "modelled" | "escalated";
export type MessageRole = "user" | "assistant";
export type Priority = "high" | "medium" | "low";

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  website: string;
  industry: string;
  description: string;
  tagline: string;
  verificationStatus: VerificationStatus;
  employeeRange: string;
  hq: string;
  foundedYear: number;
  color: string;
  fitScore?: number;
  keyMatch?: string;
  industries: string[];
}

export interface VendorSource {
  id: string;
  vendorId: string;
  sourceType: SourceType;
  label: string;
  detail: string;
  sizeKb?: number;
  processingStatus: ProcessingStatus;
  uploadedAt: string;
  extractedCount?: number;
}

export interface Evidence {
  sourceLabel: string;
  sourceType: SourceType;
  snippet: string;
}

export interface Capability {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  verificationStatus: VerificationStatus;
  evidence: Evidence[];
  tags: string[];
}

export interface Buyer {
  id: string;
  companyName: string;
  industry: string;
  companySize: number;
  createdAt: string;
  contactName: string;
  contactRole: string;
}

export interface Requirement {
  id: string;
  text: string;
  priority: Priority;
  status: "captured" | "clarifying" | "confirmed";
  source: "buyer_input" | "ai_inferred";
}

export interface ClientRealityProfile {
  buyerId: string;
  currentTechnology: string[];
  currentCostAnnual: number;
  users: number;
  processes: string[];
  painPoints: string[];
  goals: string[];
  constraints: string[];
  timelineMonths: number;
}

export interface GapItem {
  id: string;
  current: string;
  desired: string;
  gap: string;
  severity: Priority;
}

export interface SolutionMatch {
  id: string;
  requirementText: string;
  capabilityId: string;
  capabilityName: string;
  matchStatus: MatchStatus;
  confidence: number;
  reasoning: string;
}

export interface RoiProjection {
  currentAnnualCost: number;
  projectedAnnualCost: number;
  savingsPercent: number;
  paybackMonths: number;
  threeYearSavings: number;
  chart: { year: string; current: number; projected: number }[];
}

export interface SolutionModel {
  id: string;
  buyerId: string;
  vendorId: string;
  version: number;
  status: "draft" | "active" | "stale";
  executiveSummary: string;
  matches: SolutionMatch[];
  gaps: GapItem[];
  roi: RoiProjection;
  updatedAt: string;
}

export interface CapabilityFrontierItem {
  id: string;
  buyerId: string;
  buyerName: string;
  vendorId: string;
  vendorName: string;
  question: string;
  requirement: string;
  context: string;
  evidenceChecked: string[];
  reasonUnresolved: string;
  status: FrontierStatus;
  recommendedExpert: string;
  createdAt: string;
  vendorResponse?: string;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  responseStatus?: ResponseStatus;
  evidence?: Evidence[];
  assumptions?: string[];
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  agentName: string;
  action: string;
  entityType: string;
  entityName: string;
  confidence: ResponseStatus;
  humanVerified: boolean;
  timestamp: string;
}

export interface MeetingRequest {
  id: string;
  buyerName: string;
  vendorName: string;
  status: "requested" | "scheduled" | "completed";
  unresolvedCount: number;
  proposedDate?: string;
  expert: string;
}
