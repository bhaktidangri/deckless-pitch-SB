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
