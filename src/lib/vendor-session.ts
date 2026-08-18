// Client-side hand-off of vendor.id between Milestone 1 (Save Vendor
// Solution DNA Draft) and Milestone 2 (Query / Publish), per PRD Section 8:
// "store the returned vendorId client-side for Milestone 2 calls."
const STORAGE_KEY = "deckless-pitch:vendor-id";
const NAME_STORAGE_KEY = "deckless-pitch:vendor-name";

export function getStoredVendorId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredVendorId(vendorId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, vendorId);
}

export function clearStoredVendorId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(NAME_STORAGE_KEY);
}

// Company name of the registered vendor, so the portal shell (nav footer,
// role switcher) can reflect who's actually signed in instead of the
// hardcoded "CloudNova" demo placeholder.
export function getStoredVendorName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_STORAGE_KEY);
}

export function setStoredVendorName(companyName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_STORAGE_KEY, companyName);
}

// A submission the agent hasn't finished yet, persisted so Milestone-1
// completion can be detected even if the vendor navigates to Milestone 2 (or
// reloads) before the onboarding page's own poll finds the result — the
// onboarding page's polling loop dies with the component on unmount, so
// without this handoff the vendor would land on solution-dna with nothing to
// go on but the manual vendor-ID field. `deadline` is an absolute epoch ms
// timestamp so whichever page resumes polling honors the original timeout
// budget instead of restarting the clock.
const PENDING_KEY = "deckless-pitch:pending-submission";

export type PendingSubmission =
  | { kind: "new-vendor"; companyName: string; afterIso: string; deadline: number }
  | { kind: "existing-vendor"; vendorId: string; baseline: number; deadline: number };

export function getPendingSubmission(): PendingSubmission | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSubmission;
  } catch {
    return null;
  }
}

export function setPendingSubmission(pending: PendingSubmission) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function clearPendingSubmission() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}
