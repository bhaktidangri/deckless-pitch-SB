// Client-side hand-off of buyerId (and the buyer's confirmed vendorId) across
// the buyer journey's pages, mirroring src/lib/vendor-session.ts. The buyer
// workflow trigger response carries no buyerId of its own (same limitation
// as the vendor trigger), so buyerId is discovered by polling the `buyers`
// table (see buyer-lookup.ts) and then stored here for every later page.
//
// Every identity setter below also fires SESSION_EVENT so a long-lived
// component (src/app/buyer/layout.tsx in particular, which never unmounts
// while the buyer clicks around the portal) can react the instant a value
// changes instead of only picking it up on the next full route change —
// see src/lib/hooks/use-buyer-session.ts, the reactive read side of this.
// Before this existed, the layout read localStorage once per its own mount
// and had no way to notice buyerId showing up mid-session, which looked
// exactly like "stale/cached data" even though every actual network fetch
// was already using cache: "no-store".
const SESSION_EVENT = "deckless-pitch:session-changed";

function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToBuyerSession(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}

const BUYER_ID_KEY = "deckless-pitch:buyer-id";
const COMPANY_NAME_KEY = "deckless-pitch:buyer-company-name";
const SELECTED_VENDOR_ID_KEY = "deckless-pitch:selected-vendor-id";
const SELECTED_VENDOR_NAME_KEY = "deckless-pitch:selected-vendor-name";
const SOLUTION_MODEL_ID_KEY = "deckless-pitch:solution-model-id";

export function getStoredBuyerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BUYER_ID_KEY);
}

export function setStoredBuyerId(buyerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUYER_ID_KEY, buyerId);
  notifySessionChanged();
}

export function getStoredCompanyName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COMPANY_NAME_KEY);
}

export function setStoredCompanyName(companyName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANY_NAME_KEY, companyName);
  notifySessionChanged();
}

// Step 3 ("Confirm Vendor Selection") is a hard gate — every page from
// Build Client Reality Profile onward reads this saved vendorId as the
// single source of truth for "which vendor" (PRD §5 Step 3). Stored
// client-side too so the frontend can gate navigation the same way before
// it's even re-confirmed the value against Supabase.
export function getStoredSelectedVendorId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_VENDOR_ID_KEY);
}

export function setStoredSelectedVendor(vendorId: string, companyName?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_VENDOR_ID_KEY, vendorId);
  if (companyName) window.localStorage.setItem(SELECTED_VENDOR_NAME_KEY, companyName);
  notifySessionChanged();
}

export function getStoredSelectedVendorName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_VENDOR_NAME_KEY);
}

export function getStoredSolutionModelId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SOLUTION_MODEL_ID_KEY);
}

export function setStoredSolutionModelId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOLUTION_MODEL_ID_KEY, id);
  notifySessionChanged();
}

export function clearBuyerSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BUYER_ID_KEY);
  window.localStorage.removeItem(COMPANY_NAME_KEY);
  window.localStorage.removeItem(SELECTED_VENDOR_ID_KEY);
  window.localStorage.removeItem(SELECTED_VENDOR_NAME_KEY);
  window.localStorage.removeItem(SOLUTION_MODEL_ID_KEY);
  notifySessionChanged();
}

// A trigger the agent hasn't finished resolving to a buyerId yet, persisted
// so completion can be detected even if the buyer navigates away (or
// reloads) before /buyer/discover's own poll finds the result — mirrors
// vendor-session.ts's PendingSubmission handoff exactly.
const PENDING_KEY = "deckless-pitch:pending-buyer-submission";

export interface PendingBuyerSubmission {
  companyName: string;
  afterIso: string;
  deadline: number;
}

export function getPendingBuyerSubmission(): PendingBuyerSubmission | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBuyerSubmission;
  } catch {
    return null;
  }
}

export function setPendingBuyerSubmission(pending: PendingBuyerSubmission) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function clearPendingBuyerSubmission() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}

// Every triggerBuyerRequirementSubmission() call returns a workflow_run_id —
// kept as a small history (mirrors vendor-session's RUN_IDS_KEY) so the HITL
// bridge can correlate a pending approval push back to this browser's most
// recent run(s) when a page doesn't yet know the request id directly.
const RUN_IDS_KEY = "deckless-pitch:buyer-workflow-run-ids";
const MAX_STORED_RUN_IDS = 10;

export function addStoredBuyerWorkflowRunId(runId: string) {
  if (typeof window === "undefined" || !runId) return;
  const existing = getStoredBuyerWorkflowRunIds();
  if (existing.includes(runId)) return;
  window.localStorage.setItem(RUN_IDS_KEY, JSON.stringify([runId, ...existing].slice(0, MAX_STORED_RUN_IDS)));
}

export function getStoredBuyerWorkflowRunIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RUN_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
