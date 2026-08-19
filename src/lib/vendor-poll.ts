// Shared Milestone-1-completion polling (see vendor-lookup.ts for why this
// polls our own Supabase tables instead of the Yoxa API). Extracted so both
// the onboarding page (Milestone 1, polls while the vendor waits) and the
// solution-dna page (Milestone 2, resumes polling if the vendor navigated
// away before Milestone 1 finished — see vendor-session's pending-submission
// handoff) share one implementation instead of drifting apart.

import { countDraftCapabilities, findVendorCreatedAfter } from "@/lib/api/vendor-lookup";
import { getVendorKnowledgeDocument, type VendorKnowledgeDocument } from "@/lib/api/vendor-knowledge";

export const POLL_INTERVAL_MS = 4000;
export const POLL_TIMEOUT_MS = 3 * 60 * 1000;
// Milestone 2 now runs unattended end-to-end (query -> decide -> publish ->
// generate PPTX), so the knowledge-deck poll gets a longer budget than the
// draft-capability polls above — there's more agent work happening per tick
// with nothing for the vendor to do but wait.
export const KNOWLEDGE_POLL_TIMEOUT_MS = 6 * 60 * 1000;

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

// Polls for the row 'save-vendor-knowledge-document' writes once Yoxa's
// "Generate and Upload Vendor Knowledge PPTX" Output Tool finishes — this is
// the terminal event of Milestone 2 now that publish no longer waits on a
// human decision, so the review screen has nothing else left to wait for.
export function pollForKnowledgeDocument(
  vendorId: string,
  deadline: number,
  onFound: (doc: VendorKnowledgeDocument) => void,
  onTimeout: () => void
): PollHandle {
  let cancelled = false;

  async function tick() {
    if (cancelled) return;
    try {
      const doc = await getVendorKnowledgeDocument(vendorId);
      if (doc) {
        if (!cancelled) onFound(doc);
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
