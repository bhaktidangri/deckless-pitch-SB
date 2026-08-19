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

  let res: Response;
  try {
    res = await fetch(`${YOXA_API_BASE}/workflow-deployments/${deploymentId}/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Yoxa-Deployment-Secret": secret,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ trigger_text: triggerText }),
    });
  } catch {
    throw new YoxaBuyerTriggerError("Could not reach the Yoxa buyer workflow trigger.", 502);
  }

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
