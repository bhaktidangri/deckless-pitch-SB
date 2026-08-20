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
// server-side on Yoxa's end — moot now anyway, since the workflow's
// "Ingest Vendor Documents and Direct Inputs" tool has been removed from
// the redeployed workflow. Milestone 1 is crawl-only; trigger_text now only
// carries vendor identity/profile fields, not capability source text.
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
      console.error(`[yoxa-trigger] attempt ${attempt} failed reaching ${url}:`, err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new YoxaTriggerError(
    `Could not reach the Yoxa workflow trigger.${lastErr instanceof Error ? ` (${lastErr.message})` : ""}`,
    502
  );
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

  const res = await fetchTriggerWithRetry(`${YOXA_API_BASE}/workflow-deployments/${deploymentId}/trigger`, secret, triggerText);

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
