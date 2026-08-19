// Polling helpers for the buyer workflow, mirroring src/lib/vendor-poll.ts.
// The buyer deployment has no run-status endpoint either, so every
// asynchronous step (buyerId assignment, the agent's own writes, a pending
// human-approval pause) is detected by polling Supabase directly.

import { findBuyerCreatedAfter } from "@/lib/api/buyer-lookup";

export const POLL_INTERVAL_MS = 4000;
export const POLL_TIMEOUT_MS = 3 * 60 * 1000;
// The full buyer journey (requirement capture -> recommend -> confirm ->
// discovery -> fit/gap -> solution model -> deck) runs unattended across
// several agent steps once triggered, so give result-waits more budget than
// the single-step vendor-side polls.
export const WORKFLOW_STEP_TIMEOUT_MS = 6 * 60 * 1000;

export interface PollHandle {
  cancel: () => void;
}

// Generic poller: calls `check`, and calls onFound the first time it
// resolves to a non-null/non-undefined value, else keeps polling until
// `deadline` (an absolute epoch ms timestamp) passes.
export function pollUntil<T>(
  check: () => Promise<T | null | undefined>,
  deadline: number,
  onFound: (value: T) => void,
  onTimeout: () => void
): PollHandle {
  let cancelled = false;

  async function tick() {
    if (cancelled) return;
    try {
      const value = await check();
      if (value !== null && value !== undefined) {
        if (!cancelled) onFound(value);
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

export function pollForNewBuyerId(
  companyName: string,
  afterIso: string,
  deadline: number,
  onFound: (buyerId: string) => void,
  onTimeout: () => void
): PollHandle {
  return pollUntil(
    async () => {
      const buyer = await findBuyerCreatedAfter(companyName, afterIso);
      return buyer?.id ?? null;
    },
    deadline,
    onFound,
    onTimeout
  );
}
