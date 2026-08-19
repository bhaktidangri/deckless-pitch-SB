// Server-only client for the Yoxa.ai public workflow-deployment API backing
// the "vendor_source_submission" trigger (PRD Section 5.1). Import this only
// from server code (route handlers) — YOXA_DEPLOYMENT_SECRET must never
// reach the browser.
//
// Contract below was reverse-engineered against the live deployment (no
// public API docs were available): the deployment only exposes /verify and
// /trigger — sibling guesses like /invoke, /run, /execute, /webhook all 404.
// /trigger requires an Idempotency-Key header, then a JSON body of
// { trigger_text: string }, and responds 202 with a workflow_run_id.
// File-upload input (multipart, field name "file") consistently 500s
// server-side on Yoxa's end — that path is NOT wired here; document upload
// stays a manual "paste key excerpts as text" workaround until Yoxa's file
// input is fixed or documented.
//
// There is no run-status/polling endpoint on this API (every guess 404s,
// and GET on /trigger itself is 405). Completion is instead detected by
// polling our own Supabase `vendors` table — see src/lib/api/vendor-lookup.ts.

const YOXA_API_BASE = "https://yoxa.ai/api/v1/public";

export interface TriggerVendorSourceSubmissionResult {
  accepted: boolean;
  deploymentId: string;
  triggerAttemptId: string;
  workflowRunId: string;
  status: string;
}

export class YoxaTriggerError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "YoxaTriggerError";
    this.status = status;
    this.code = code;
  }
}

export async function triggerVendorSourceSubmission(triggerText: string): Promise<TriggerVendorSourceSubmissionResult> {
  const deploymentId = process.env.YOXA_WORKFLOW_DEPLOYMENT_ID;
  const secret = process.env.YOXA_DEPLOYMENT_SECRET;
  if (!deploymentId || !secret) {
    throw new YoxaTriggerError(
      "The vendor workflow trigger isn't configured (YOXA_WORKFLOW_DEPLOYMENT_ID / YOXA_DEPLOYMENT_SECRET missing).",
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
    throw new YoxaTriggerError("Could not reach the Yoxa workflow trigger.", 502);
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok || !data.accepted) {
    const err = data?.error as { message?: string; code?: string } | undefined;
    throw new YoxaTriggerError(err?.message ?? `Trigger request failed (${res.status}).`, res.status, err?.code);
  }

  return {
    accepted: true,
    deploymentId: data.deployment_id as string,
    triggerAttemptId: data.trigger_attempt_id as string,
    workflowRunId: data.workflow_run_id as string,
    status: data.status as string,
  };
}
