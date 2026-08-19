"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalButtons } from "@/components/shared/approval-buttons";
import {
  addStoredBuyerWorkflowRunId,
  clearPendingBuyerSubmission,
  getPendingBuyerSubmission,
  getStoredBuyerId,
  getStoredBuyerWorkflowRunIds,
  getStoredCompanyName,
  setPendingBuyerSubmission,
  setStoredBuyerId,
  setStoredCompanyName,
} from "@/lib/buyer-session";
import { getBuyerRequirements, getClientRealityProfile, linkBuyerWorkflowRun, type BuyerRequirementRow, type ClientRealityProfileRow } from "@/lib/api/buyer-lookup";
import { POLL_TIMEOUT_MS, pollForNewBuyerId, type PollHandle } from "@/lib/buyer-poll";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { cn } from "@/lib/utils";

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics", "Other"];

type Stage = "idle" | "submitting" | "processing" | "timed-out" | "error" | "ready";

// Replaces the old scripted fixed-question demo. PRD §5 Step 1/4 is explicit
// that the required problem statement plus optional business-context fields
// arrive together on this one form submission — open-ended fields
// (currentTechnology, currentCostAnnual, users, timelineMonths, compliance)
// belong here, not in a chat loop, because 'Run Adaptive Discovery
// Questioning' structurally cannot collect typed free text (PRD §7.1).
export default function DiscoverPage() {
  const existingBuyerId = getStoredBuyerId();
  const pollHandleRef = useRef<PollHandle | null>(null);
  useEffect(() => () => pollHandleRef.current?.cancel(), []);

  const [companyName, setCompanyName] = useState(getStoredCompanyName() ?? "");
  const [industry, setIndustry] = useState(industryOptions[0]);
  const [companySize, setCompanySize] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [currentTechnology, setCurrentTechnology] = useState("");
  const [currentCostAnnual, setCurrentCostAnnual] = useState("");
  const [users, setUsers] = useState("");
  const [timelineMonths, setTimelineMonths] = useState("");
  const [compliance, setCompliance] = useState("");

  const [stage, setStage] = useState<Stage>(existingBuyerId ? "ready" : "idle");
  const [buyerId, setBuyerId] = useState<string | null>(existingBuyerId);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const [requirements, setRequirements] = useState<BuyerRequirementRow[]>([]);
  const [profile, setProfile] = useState<ClientRealityProfileRow | null>(null);

  const canSubmit = companyName.trim() && problemStatement.trim();

  const questioning = usePendingApproval("adaptive_discovery_questioning", {
    buyerId,
    workflowRunIds: getStoredBuyerWorkflowRunIds(),
    enabled: stage === "ready",
  });

  useEffect(() => {
    if (stage !== "ready" || !buyerId) return;
    let cancelled = false;
    async function load() {
      try {
        const [reqs, p] = await Promise.all([getBuyerRequirements(buyerId!), getClientRealityProfile(buyerId!)]);
        if (!cancelled) {
          setRequirements(reqs);
          setProfile(p);
        }
      } catch {
        // transient — next interval tick retries
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stage, buyerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStage("submitting");
    setError(null);
    const triggeredAt = new Date().toISOString();

    try {
      const res = await fetch("/api/buyer-requirement-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: existingBuyerId ?? undefined,
          companyName: companyName.trim(),
          industry: existingBuyerId ? undefined : industry,
          companySize: existingBuyerId ? undefined : companySize ? Number(companySize) : undefined,
          contactName: existingBuyerId ? undefined : contactName.trim() || undefined,
          contactRole: existingBuyerId ? undefined : contactRole.trim() || undefined,
          problemStatement: problemStatement.trim(),
          currentTechnology: currentTechnology.trim() || undefined,
          currentCostAnnual: currentCostAnnual.trim() || undefined,
          users: users.trim() || undefined,
          timelineMonths: timelineMonths.trim() || undefined,
          compliance: compliance.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Submission failed.");
        setStage("error");
        return;
      }

      const workflowRunId = typeof data?.workflowRunId === "string" ? data.workflowRunId : null;
      setRunId(workflowRunId);
      if (workflowRunId) addStoredBuyerWorkflowRunId(workflowRunId);
      setStoredCompanyName(companyName.trim());

      if (existingBuyerId) {
        setBuyerId(existingBuyerId);
        setStage("ready");
        if (workflowRunId) linkBuyerWorkflowRun(workflowRunId, existingBuyerId);
        return;
      }

      setStage("processing");
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      setPendingBuyerSubmission({ companyName: companyName.trim(), afterIso: triggeredAt, deadline });
      pollHandleRef.current = pollForNewBuyerId(
        companyName.trim(),
        triggeredAt,
        deadline,
        (id) => {
          setStoredBuyerId(id);
          setBuyerId(id);
          clearPendingBuyerSubmission();
          setStage("ready");
          if (workflowRunId) linkBuyerWorkflowRun(workflowRunId, id);
        },
        () => setStage("timed-out")
      );
    } catch {
      setError("Could not reach the submission endpoint. Check your connection and try again.");
      setStage("error");
    }
  }

  function resumePolling() {
    const pending = getPendingBuyerSubmission();
    if (!pending) return;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    setPendingBuyerSubmission({ ...pending, deadline });
    setStage("processing");
    pollHandleRef.current = pollForNewBuyerId(
      pending.companyName,
      pending.afterIso,
      deadline,
      (id) => {
        setStoredBuyerId(id);
        setBuyerId(id);
        clearPendingBuyerSubmission();
        setStage("ready");
        // Page reload lost the runId local state (see handleSubmit) — the
        // most recent stored run id is the one this submission created.
        const [mostRecentRunId] = getStoredBuyerWorkflowRunIds();
        if (mostRecentRunId) linkBuyerWorkflowRun(mostRecentRunId, id);
      },
      () => setStage("timed-out")
    );
  }

  if (stage === "processing" || stage === "timed-out") {
    return (
      <div>
        <PageHeader
          eyebrow="Understand Buyer Requirement"
          title="Analyzing your submission…"
          description="The Buyer Discovery Agent is capturing your requirements and will match them against verified vendor capabilities."
        />
        <Card className="max-w-md p-6 text-center">
          {stage === "processing" ? (
            <>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
              <p className="mt-3 text-sm text-muted">This can take a minute or two while the agent works.</p>
              {runId && <p className="mt-2 font-mono text-[11px] text-subtle">run {runId}</p>}
            </>
          ) : (
            <>
              <Clock className="mx-auto h-6 w-6 text-modelled" />
              <p className="mt-3 text-sm font-medium text-foreground">Still processing after a few minutes.</p>
              <p className="mt-1 text-sm text-muted">
                Your submission is running —{" "}
                <button className="text-brand-600 underline dark:text-brand-400" onClick={resumePolling}>
                  keep checking
                </button>
                . It&apos;ll load automatically once your buyer record is ready.
              </p>
              {runId && <p className="mt-2 font-mono text-[11px] text-subtle">run {runId}</p>}
            </>
          )}
        </Card>
      </div>
    );
  }

  if (stage === "ready" && buyerId) {
    return (
      <div>
        <PageHeader
          eyebrow="Buyer Discovery Agent"
          title={`Welcome, ${companyName || getStoredCompanyName() || "buyer"}`}
          description="Your requirements are captured here as the agent parses them. Answer any clarifying questions below, then head to vendor recommendations."
          actions={
            <Link href="/buyer/vendors" className={cn(buttonVariants({ variant: "primary" }))}>
              See vendor recommendations <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {questioning.approval && (
          <Card className="mb-6 border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> One quick question
              </CardTitle>
              {questioning.approval.description && <CardDescription>{questioning.approval.description}</CardDescription>}
            </CardHeader>
            <CardContent className="pt-2">
              <ApprovalButtons
                options={questioning.approval.options}
                responding={questioning.responding}
                onChoose={(optionId) => questioning.respond({ optionId })}
                includeSkip
              />
              {questioning.error && <p className="mt-2 text-xs text-escalated">{questioning.error}</p>}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Requirements captured</CardTitle>
              <CardDescription>Parsed directly from your submission — each one atomic, so it matches independently.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {requirements.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for the agent to parse your submission…
                </p>
              ) : (
                requirements.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3">
                    <span className="text-sm text-foreground">{r.text}</span>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant="outline" size="sm">{r.priority}</Badge>
                      {r.source === "ai_inferred" && <Badge variant="modelled" size="sm">inferred</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Reality Profile</CardTitle>
              <CardDescription>Building live as the agent fills gaps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {!profile ? (
                <p className="text-sm text-subtle">Nothing captured yet.</p>
              ) : (
                <>
                  <ProfileRow label="Current cost/yr" value={profile.currentCostAnnual} />
                  <ProfileRow label="Users" value={profile.users} />
                  <ProfileRow label="Timeline (months)" value={profile.timelineMonths} />
                  {profile.currentTechnology.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-subtle">Current technology</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.currentTechnology.map((t) => (
                          <span key={t} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Understand Buyer Requirement"
        title="Tell us about your business"
        description="Describe your problem in your own words, then fill in whatever business context you already know — the agent asks only for what's still missing, and only as closed yes/no or pick-one questions."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your business problem</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!existingBuyerId && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="companyName">Company name</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Meridian Retail Group" required />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                      {industryOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="companySize">Company size (employees)</Label>
                    <Input id="companySize" type="number" min={1} value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="500" />
                  </div>
                  <div>
                    <Label htmlFor="contactName">Your name</Label>
                    <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Priya Sharma" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="contactRole">Your role</Label>
                    <Input id="contactRole" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="VP of Technology" />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="problemStatement">What&apos;s the primary problem you&apos;re facing? *</Label>
                <Textarea
                  id="problemStatement"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  rows={4}
                  placeholder="We need to reduce our cloud infrastructure cost and our current setup is hard to scale."
                  required
                />
              </div>

              <p className="pt-2 text-xs font-medium uppercase tracking-wide text-subtle">Optional business context — fill in what you know</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="currentTechnology">Current systems / technology</Label>
                  <Input id="currentTechnology" value={currentTechnology} onChange={(e) => setCurrentTechnology(e.target.value)} placeholder="On-prem VMware cluster, legacy Java monolith, MySQL 5.7" />
                </div>
                <div>
                  <Label htmlFor="currentCostAnnual">Current annual cost</Label>
                  <Input id="currentCostAnnual" value={currentCostAnnual} onChange={(e) => setCurrentCostAnnual(e.target.value)} placeholder="₹42,00,000" />
                </div>
                <div>
                  <Label htmlFor="users">Users / load supported today</Label>
                  <Input id="users" value={users} onChange={(e) => setUsers(e.target.value)} placeholder="500" />
                </div>
                <div>
                  <Label htmlFor="timelineMonths">Target timeline (months)</Label>
                  <Input id="timelineMonths" type="number" min={1} value={timelineMonths} onChange={(e) => setTimelineMonths(e.target.value)} placeholder="6" />
                </div>
                <div>
                  <Label htmlFor="compliance">Compliance / regulatory requirements</Label>
                  <Input id="compliance" value={compliance} onChange={(e) => setCompliance(e.target.value)} placeholder="PCI-DSS" />
                </div>
              </div>

              {stage === "error" && error && (
                <div className="flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg px-3 py-2.5 text-sm text-escalated">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canSubmit || stage === "submitting"} loading={stage === "submitting"}>
                  {stage === "submitting" ? "Submitting…" : "Start discovery"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">What happens next?</p>
              <p className="mt-2 text-sm text-muted">
                The Buyer Discovery Agent parses this into structured requirements immediately, then the Solution
                Matching Agent ranks vendors against them. Anything still missing gets asked as a quick closed
                question here — never a long form.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
