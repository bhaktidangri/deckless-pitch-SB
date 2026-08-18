// Shared Milestone-1-completion polling (see vendor-lookup.ts for why this
// polls our own Supabase tables instead of the Yoxa API). Extracted so both
// the onboarding page (Milestone 1, polls while the vendor waits) and the
// solution-dna page (Milestone 2, resumes polling if the vendor navigated
// away before Milestone 1 finished — see vendor-session's pending-submission
// handoff) share one implementation instead of drifting apart.

import { countDraftCapabilities, findVendorCreatedAfter } from "@/lib/api/vendor-lookup";

export const POLL_INTERVAL_MS = 4000;
export const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export interface PollHandle {
  cancel: () => void;
}

export function pollForNewVendorId(
  companyName: string,
  afterIso: string,
  deadline: number,
  onFound: (vendorId: string) => void,
  onTimeout: () => void
): PollHandle {
  let cancelled = false;

  async function tick() {
    if (cancelled) return;
    try {
      const vendor = await findVendorCreatedAfter(companyName, afterIso);
      if (vendor) {
        if (!cancelled) onFound(vendor.id);
        return;
      }
    } catch {
      // transient read error — keep polling until the deadline
    }
    if (cancelled) return;
    if (Date.now() >= deadline) {
      onTimeout();
      return;
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  }

  tick();
  return { cancel: () => { cancelled = true; } };
}

export function pollForNewCapabilities(
  vendorId: string,
  baseline: number,
  deadline: number,
  onFound: () => void,
  onTimeout: () => void
): PollHandle {
  let cancelled = false;

  async function tick() {
    if (cancelled) return;
    try {
      const count = await countDraftCapabilities(vendorId);
      if (count > baseline) {
        if (!cancelled) onFound();
        return;
      }
    } catch {
      // transient read error — keep polling until the deadline
    }
    if (cancelled) return;
    if (Date.now() >= deadline) {
      onTimeout();
      return;
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  }

  tick();
  return { cancel: () => { cancelled = true; } };
}
