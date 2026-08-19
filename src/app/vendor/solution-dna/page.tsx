"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Dna, Loader2, MessageCircleQuestion, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CapabilityApprovalCard, type ResolvedDecision } from "@/components/shared/capability-approval-card";
import {
  publishApprovedVendorSolutionDna,
  queryDraftVendorCapabilities,
  VendorDnaApiError,
  type ApprovalDecision,
  type PublishApprovedVendorSolutionDnaResponse,
  type SavedCapability,
} from "@/lib/api/vendor-dna";
import {
  clearPendingSubmission,
  getPendingSubmission,
  getStoredVendorId,
  getStoredWorkflowRunIds,
  setStoredVendorId,
  setStoredVendorName,
} from "@/lib/vendor-session";
import {
  findPendingApprovalForCapability,
  findPendingApprovalsForWorkflowRuns,
  respondToApprovalRequest,
  type ApprovalOptionId,
  type PendingApprovalRequest,
} from "@/lib/api/vendor-dna-approvals";
import { POLL_INTERVAL_MS, pollForNewCapabilities, pollForNewVendorId, type PollHandle } from "@/lib/vendor-poll";

type Stage = "need-vendor-id" | "loading" | "error" | "reviewing" | "publishing" | "published";

export default function SolutionDnaPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorIdInput, setVendorIdInput] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("need-vendor-id");
  const [error, setError] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<SavedCapability[]>([]);
  const [cursor, setCursor] = useState(0);
  const [decisions, setDecisions] = useState<ApprovalDecision[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [publishResult, setPublishResult] = useState<PublishApprovedVendorSolutionDnaResponse | null>(null);

  // Real HITL sync, not the capability-card piggyback below: workflow_run_id
  // is reliably present on every approval-request row Yoxa's webhook ever
  // produces (capability_id often isn't — see api/webhooks/yoxa-hitl and
  // vendor-dna-approvals.ts), so this is scoped to every run this browser
  // has actually triggered and answers go straight back through respond/.
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalRequest[]>([]);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  const refreshPendingApprovals = useCallback(async () => {
    const runIds = getStoredWorkflowRunIds();
    if (runIds.length === 0) {
      setPendingApprovals([]);
      return;
    }
    const rows = await findPendingApprovalsForWorkflowRuns(runIds);
    setPendingApprovals(rows);
  }, []);

  useEffect(() => {
    refreshPendingApprovals();
    const interval = setInterval(refreshPendingApprovals, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshPendingApprovals]);

  async function handleAnswerPendingApproval(requestId: string, optionId: ApprovalOptionId) {
    setRespondingRequestId(requestId);
    try {
      await respondToApprovalRequest(requestId, optionId);
    } finally {
      setRespondingRequestId(null);
      // Remove immediately regardless of yoxaNotified — resolve-vendor-dna-
      // approval-request already marked it resolved in Supabase either way,
      // so leaving it listed as pending would be its own sync bug.
      setPendingApprovals((rows) => rows.filter((r) => r.requestId !== requestId));
    }
  }

  // True while this page is auto-polling for a Milestone 1 submission that
  // hadn't finished yet when the vendor navigated here (see vendor-session's
  // pending-submission handoff and vendor-poll.ts) — lets "need-vendor-id"
  // show a live status instead of dead-ending on the manual paste field.
  const [autoPolling, setAutoPolling] = useState(false);
  const pollHandleRef = useRef<PollHandle | null>(null);

  useEffect(() => {
    const stored = getStoredVendorId();
    if (stored) {
      loadCapabilities(stored);
      return;
    }

    const pending = getPendingSubmission();
    if (!pending || Date.now() >= pending.deadline) {
      if (pending) clearPendingSubmission();
      return;
    }

    setAutoPolling(true);
    if (pending.kind === "new-vendor") {
      pollHandleRef.current = pollForNewVendorId(
        pending.companyName,
        pending.afterIso,
        pending.deadline,
        (foundVendorId) => {
          setStoredVendorId(foundVendorId);
          loadCapabilities(foundVendorId);
        },
        () => {
          clearPendingSubmission();
          setAutoPolling(false);
        }
      );
    } else {
      pollHandleRef.current = pollForNewCapabilities(
        pending.vendorId,
        pending.baseline,
        pending.deadline,
        () => loadCapabilities(pending.vendorId),
        () => {
          clearPendingSubmission();
          setAutoPolling(false);
        }
      );
    }

    return () => pollHandleRef.current?.cancel();
  }, []);

  async function loadCapabilities(id: string) {
    pollHandleRef.current?.cancel();
    setAutoPolling(false);
    clearPendingSubmission();
    setStage("loading");
    setError(null);
    try {
      // Step 1 (mandatory, always first) per PRD 5.3.1 — Query Draft Vendor
      // Capabilities is the only source of capability data in this
      // milestone; nothing here should be inferred from Milestone 1's
      // savedCapabilityIds or summary counts alone.
      const result = await queryDraftVendorCapabilities(id);
      setVendorId(result.vendorId);
      setCompanyName(result.companyName);
      setStoredVendorId(result.vendorId);
      setStoredVendorName(result.companyName);
      setCapabilities(result.capabilities);
      setCursor(0);
      setDecisions([]);
      setSkippedIds(new Set());
      setStage("reviewing");
    } catch (e) {
      setError(e instanceof VendorDnaApiError ? e.message : "Could not load draft capabilities.");
      setStage("error");
    }
  }

  // If this exact capability also has a Yoxa run genuinely paused on it
  // (i.e. a webhook was received for it — see api/webhooks/yoxa-hitl), also
  // forward the decision so that run resumes instead of hibernating
  // forever. Best-effort and silent: when no webhook has been registered
  // with Yoxa yet, no pending row will ever exist and this is a no-op — the
  // rest of the review/publish flow is unaffected either way.
  function notifyYoxaIfPending(capabilityId: string, optionId: ApprovalOptionId) {
    findPendingApprovalForCapability(capabilityId)
      .then((pending) => pending && respondToApprovalRequest(pending.requestId, optionId))
      .catch(() => {});
  }

  function handleDecide(decision: ResolvedDecision) {
    setDecisions((d) => [...d, decision]);
    setCursor((c) => c + 1);
    const optionId: ApprovalOptionId =
      decision.verificationStatus === "unverified" ? "option_3" : decision.description ? "option_2" : "option_1";
    notifyYoxaIfPending(decision.capabilityId, optionId);
  }

  function handleLeavePending() {
    const current = capabilities[cursor];
    if (current) {
      setSkippedIds((s) => new Set(s).add(current.id));
      notifyYoxaIfPending(current.id, "option_4");
    }
    setCursor((c) => c + 1);
  }

  async function handlePublish() {
    if (!vendorId || decisions.length === 0) return;
    setStage("publishing");
    setError(null);
    try {
      const result = await publishApprovedVendorSolutionDna(vendorId, decisions);
      setPublishResult(result);
      setStage("published");
    } catch (e) {
      setError(e instanceof VendorDnaApiError ? e.message : "Could not publish approved capabilities.");
      setStage("reviewing");
    }
  }

  const current = capabilities[cursor];
  const remaining = Math.max(capabilities.length - cursor, 0);
  const loopFinished = capabilities.length > 0 && cursor >= capabilities.length;

  if (stage === "need-vendor-id" || (stage === "error" && !vendorId)) {
    return (
      <div>
        <PageHeader
          eyebrow="Milestone 2 — Review and Publish Vendor Solution DNA"
          title="Solution DNA review"
          description="Once your sources are submitted and a vendor is registered, this screen loads your draft capabilities for review."
        />
        {pendingApprovals.length > 0 && (
          <PendingApprovalsPanel
            requests={pendingApprovals}
            respondingRequestId={respondingRequestId}
            onAnswer={handleAnswerPendingApproval}
          />
        )}
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-5">
            {autoPolling ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2.5 text-sm text-foreground dark:border-brand-900 dark:bg-brand-950/20">
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600 dark:text-brand-400" />
                <span>
                  Your Milestone 1 submission is still processing — this screen checks automatically and loads your
                  draft the moment it&apos;s ready.
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No vendor is loaded in this browser yet. If you already registered via{" "}
                <Link href="/vendor/onboarding" className="text-brand-600 underline dark:text-brand-400">
                  the intake form
                </Link>
                , paste your vendor ID below to resume review.
              </p>
            )}
            <div>
              <Label htmlFor="vendorId">Vendor ID</Label>
              <Input
                id="vendorId"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={vendorIdInput}
                onChange={(e) => setVendorIdInput(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-escalated">{error}</p>}
            <Button className="w-full" onClick={() => vendorIdInput.trim() && loadCapabilities(vendorIdInput.trim())}>
              Load draft capabilities <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-muted">Loading draft capabilities…</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div>
        <PageHeader eyebrow={companyName ?? undefined} title="Solution DNA review" />
        <Card className="max-w-md border-escalated-border bg-escalated-bg">
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-escalated" />
            <div>
              <p className="text-sm font-medium text-foreground">{error}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => vendorId && loadCapabilities(vendorId)}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "published" && publishResult) {
    return (
      <div>
        <PageHeader eyebrow={companyName ?? undefined} title="Your Solution DNA is live" />
        <Card className="max-w-lg border-verified-border bg-verified-bg">
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-2 text-verified">
              <PartyPopper className="h-5 w-5" />
              <p className="text-sm font-semibold">
                {publishResult.publishedCapabilityIds.length} capabilit
                {publishResult.publishedCapabilityIds.length === 1 ? "y" : "ies"} published and visible to buyers.
              </p>
            </div>
            {publishResult.unpublishedCapabilityIds.length > 0 && (
              <p className="text-sm text-foreground/80">
                {publishResult.unpublishedCapabilityIds.length} capabilit
                {publishResult.unpublishedCapabilityIds.length === 1 ? "y stays" : "ies stay"} saved but unpublished — you
                can revisit them anytime by returning to this screen.
              </p>
            )}
            <p className="text-xs text-muted">Published at {new Date(publishResult.publishedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${companyName ?? "Vendor"} · Milestone 2`}
        title="Review and publish your Solution DNA"
        description="One capability at a time — approve, revise, reject, or leave pending. Publish once you're ready."
      />

      {pendingApprovals.length > 0 && (
        <PendingApprovalsPanel
          requests={pendingApprovals}
          respondingRequestId={respondingRequestId}
          onAnswer={handleAnswerPendingApproval}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatPill icon={Dna} label="Total" value={capabilities.length} />
        <StatPill icon={CheckCircle2} label="Decided" value={decisions.length} tone="verified" />
        <StatPill icon={AlertTriangle} label="Left pending" value={skippedIds.size} tone="escalated" />
      </div>

      {error && (
        <Card className="mb-4 border-escalated-border bg-escalated-bg">
          <CardContent className="py-3 text-sm text-escalated">{error}</CardContent>
        </Card>
      )}

      {current && !loopFinished && (
        <CapabilityApprovalCard
          key={current.id}
          capability={current}
          remaining={remaining}
          onDecide={handleDecide}
          onLeavePending={handleLeavePending}
        />
      )}

      {loopFinished && (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            {capabilities.length === 0
              ? "No draft capabilities on file for this vendor yet."
              : "You've been through every draft capability."}
          </p>
        </Card>
      )}

      {/* Publish never has to wait for the whole loop — PRD 5.3.4: it "may
          run as soon as at least one capability has a decision." Surface the
          publish/stop choice the moment there's something to publish. */}
      {decisions.length > 0 && (
        <Card className="mt-4 border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{decisions.length}</span> decision{decisions.length === 1 ? "" : "s"} ready to
              publish{!loopFinished ? ` — ${remaining} capabilit${remaining === 1 ? "y" : "ies"} still unreviewed` : ""}.
            </p>
            <div className="flex items-center gap-2">
              {!loopFinished && (
                <Button size="sm" variant="secondary" onClick={() => setCursor(capabilities.length)}>
                  Finish later
                </Button>
              )}
              <Button size="sm" onClick={handlePublish} loading={stage === "publishing"}>
                Publish now
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone?: "verified" | "escalated" | "default";
}) {
  const toneClass: Record<string, string> = {
    verified: "text-verified bg-verified-bg",
    escalated: "text-escalated bg-escalated-bg",
    default: "text-muted bg-surface-2",
  };
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${toneClass[tone]}`}>
      <Icon className="h-3.5 w-3.5" /> {value} {label}
    </div>
  );
}

// Direct answers to Yoxa's paused "Request Vendor DNA Approval" HITL calls —
// separate from the capability review loop above, which only piggybacks a
// notification when a card's capability_id happens to match one of these.
// These are matched by workflow_run_id instead (see
// findPendingApprovalsForWorkflowRuns), so they show up reliably even when
// capability_id is null or points at a capability not in the current draft.
function PendingApprovalsPanel({
  requests,
  respondingRequestId,
  onAnswer,
}: {
  requests: PendingApprovalRequest[];
  respondingRequestId: string | null;
  onAnswer: (requestId: string, optionId: ApprovalOptionId) => void;
}) {
  return (
    <Card className="mb-6 border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircleQuestion className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Your Vendor Intelligence Agent is waiting on {requests.length} question{requests.length === 1 ? "" : "s"}
        </div>
        {requests.map((request) => {
          const busy = respondingRequestId === request.requestId;
          return (
            <div key={request.requestId} className="rounded-lg border border-border bg-surface p-4">
              {request.title && <p className="text-sm font-medium text-foreground">{request.title}</p>}
              {request.description && <p className="mt-1 text-sm text-muted">{request.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {request.options.length > 0 ? (
                  request.options.map((option) => (
                    <Button
                      key={option.option_id}
                      size="sm"
                      variant={option.decision === "rejected" ? "outline" : "secondary"}
                      disabled={busy}
                      loading={busy}
                      onClick={() => onAnswer(request.requestId, option.option_id as ApprovalOptionId)}
                    >
                      {option.title}
                    </Button>
                  ))
                ) : (
                  <p className="text-xs text-escalated">No response options were captured for this request.</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
