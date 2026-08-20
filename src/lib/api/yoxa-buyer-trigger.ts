// Server-only client for the Yoxa.ai public workflow-deployment API backing
// the buyer-side "buyer_requirement_submission" trigger (PRD §4). Import
// only from server code (route handlers) — YOXA_BUYER_DEPLOYMENT_SECRET must
// never reach the browser.
//
// This is a separate Yoxa deployment from the vendor-side one in
// yoxa-trigger.ts — different deployment id, different secret, not
// connected to it on the Yoxa platform. Same contract shape is assumed
// (POST /trigger with an Idempotency-Key header and { trigger_text }, 202
// with a workflow_run_id, no run-status/polling endpoint) since both
// deployments sit behind the same public API — this has not yet been
// independently reverse-engineered against the buyer deployment the way the
// vendor one was, so treat 404s on sibling paths as expected until proven
// otherwise.

const YOXA_API_BASE = "https://yoxa.ai/api/v1/public";

export interface TriggerBuyerRequirementSubmissionResult {
  accepted: boolean;
  deploymentId: string;
  triggerAttemptId: string;
  workflowRunId: string;
  status: string;
}

export class YoxaBuyerTriggerError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "YoxaBuyerTriggerError";
    this.status = status;
    this.code = code;
  }
}

// A 20s timeout plus one retry on network-level failure (fetch throwing
// before any HTTP response comes back — DNS/connection reset, not a Yoxa
// rejection) since that class of error has shown up as a transient blip
// reaching yoxa.ai, not a real outage. Logs the underlying cause server-side
// either way — the previous swallow-into-one-generic-message behavior made
// this kind of blip indistinguishable from a real config/outage problem.
async function fetchTriggerWithRetry(url: string, secret: string, triggerText: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Yoxa-Deployment-Secret": secret,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ trigger_text: triggerText }),
        signal: controller.signal,
      });
      return res;
    } catch (err) {
      lastErr = err;
      console.error(`[yoxa-buyer-trigger] attempt ${attempt} failed reaching ${url}:`, err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new YoxaBuyerTriggerError(
    `Could not reach the Yoxa buyer workflow trigger.${lastErr instanceof Error ? ` (${lastErr.message})` : ""}`,
    502
  );
}

export async function triggerBuyerRequirementSubmission(
  triggerText: string
): Promise<TriggerBuyerRequirementSubmissionResult> {
  const deploymentId = process.env.YOXA_BUYER_WORKFLOW_DEPLOYMENT_ID;
  const secret = process.env.YOXA_BUYER_DEPLOYMENT_SECRET;
  if (!deploymentId || !secret) {
    throw new YoxaBuyerTriggerError(
      "The buyer workflow trigger isn't configured (YOXA_BUYER_WORKFLOW_DEPLOYMENT_ID / YOXA_BUYER_DEPLOYMENT_SECRET missing).",
      503
    );
  }

  const res = await fetchTriggerWithRetry(`${YOXA_API_BASE}/workflow-deployments/${deploymentId}/trigger`, secret, triggerText);

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok || !data.accepted) {
    const err = data?.error as { message?: string; code?: string } | undefined;
    throw new YoxaBuyerTriggerError(err?.message ?? `Trigger request failed (${res.status}).`, res.status, err?.code);
  }

  return {
    accepted: true,
    deploymentId: data.deployment_id as string,
    triggerAttemptId: data.trigger_attempt_id as string,
    workflowRunId: data.workflow_run_id as string,
    status: data.status as string,
  };
}
