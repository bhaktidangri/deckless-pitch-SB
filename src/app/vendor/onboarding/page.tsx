"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Clock, Globe, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  addStoredWorkflowRunId,
  clearPendingSubmission,
  getPendingSubmission,
  getStoredVendorId,
  setPendingSubmission,
  setStoredVendorId,
  setStoredVendorName,
} from "@/lib/vendor-session";
import { countDraftCapabilities } from "@/lib/api/vendor-lookup";
import { linkVendorAccount } from "@/lib/api/account";
import { POLL_TIMEOUT_MS, pollForNewCapabilities, pollForNewVendorId, type PollHandle } from "@/lib/vendor-poll";

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics", "Other"];

type Stage = "idle" | "submitting" | "processing" | "timed-out" | "error";

// One composed submission — org details plus a website URL — fires a single
// vendor_source_submission trigger event against the live Yoxa.ai deployment
// (PRD Section 5.1 / 8). The "Ingest Vendor Documents and Direct Inputs"
// tool has been removed from the redeployed workflow: Milestone 1 is now
// crawl-only, so website URL is the sole capability source (no direct-text
// or document upload path).
export default function VendorOnboardingPage() {
  const router = useRouter();
  const existingVendorId = getStoredVendorId();
  const pollHandleRef = useRef<PollHandle | null>(null);
  useEffect(() => () => pollHandleRef.current?.cancel(), []);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState(industryOptions[0]);
  const [description, setDescription] = useState("");

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const hasAnySource = website.trim().length > 0;
  const canSubmit = existingVendorId ? hasAnySource : companyName.trim() && hasAnySource;

  // The original poll deadline has already passed once we're in "timed-out"
  // — resuming Milestone 2's auto-poll against a stale deadline would just
  // time out again instantly, so give it a fresh budget before navigating.
  function goToReviewScreen() {
    const pending = getPendingSubmission();
    if (pending) setPendingSubmission({ ...pending, deadline: Date.now() + POLL_TIMEOUT_MS });
    router.push("/vendor/solution-dna");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStage("submitting");
    setError(null);

    let baseline = 0;
    if (existingVendorId) {
      try {
        baseline = await countDraftCapabilities(existingVendorId);
      } catch {
        // fall through — worst case the completion poll just waits the full timeout
      }
    }

    const triggeredAt = new Date().toISOString();

    try {
      const res = await fetch("/api/vendor-source-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: existingVendorId ?? undefined,
          companyName: companyName.trim() || undefined,
          website: website.trim() || undefined,
          industry: existingVendorId ? undefined : industry,
          description: description.trim() || undefined,
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
      if (workflowRunId) addStoredWorkflowRunId(workflowRunId);
      if (!existingVendorId && companyName.trim()) setStoredVendorName(companyName.trim());
      setStage("processing");
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      // Persisted before polling starts so Milestone 2 can pick up right
      // where this leaves off if the vendor navigates away early — this
      // page's own poll dies with the component on unmount.
      if (existingVendorId) {
        linkVendorAccount(existingVendorId).catch(() => {});
        setPendingSubmission({ kind: "existing-vendor", vendorId: existingVendorId, baseline, deadline });
        pollHandleRef.current = pollForNewCapabilities(
          existingVendorId,
          baseline,
          deadline,
          () => {
            clearPendingSubmission();
            router.push("/vendor/solution-dna");
          },
          () => setStage("timed-out")
        );
      } else {
        setPendingSubmission({ kind: "new-vendor", companyName: companyName.trim(), afterIso: triggeredAt, deadline });
        pollHandleRef.current = pollForNewVendorId(
          companyName.trim(),
          triggeredAt,
          deadline,
          (vendorId) => {
            setStoredVendorId(vendorId);
            linkVendorAccount(vendorId).catch(() => {});
            clearPendingSubmission();
            router.push("/vendor/solution-dna");
          },
          () => setStage("timed-out")
        );
      }
    } catch {
      setError("Could not reach the submission endpoint. Check your connection and try again.");
      setStage("error");
    }
  }

  if (stage === "processing" || stage === "timed-out") {
    return (
      <div>
        <PageHeader
          eyebrow="Milestone 1 — Ingest Vendor Sources and Build DNA Draft"
          title="Analyzing your submission…"
          description="Crawling your site feeds the Vendor Intelligence Agent, which consolidates what it finds into your Solution DNA draft."
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
                Your submission is running — check{" "}
                <button className="text-brand-600 underline dark:text-brand-400" onClick={goToReviewScreen}>
                  the review screen
                </button>{" "}
                — it keeps checking automatically and loads your draft the moment it&apos;s ready.
              </p>
              {runId && <p className="mt-2 font-mono text-[11px] text-subtle">run {runId}</p>}
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Milestone 1 — Ingest Vendor Sources and Build DNA Draft"
        title={existingVendorId ? "Add more sources" : "Register and submit your sources"}
        description="Provide your company details plus a website URL — one submission kicks off extraction into your Solution DNA draft."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Company &amp; sources
            </CardTitle>
            <CardDescription>
              {existingVendorId
                ? "You're a returning vendor — this submission adds to your existing draft."
                : "companyName registers you as a new vendor on your first submission."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!existingVendorId && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Company name</Label>
                    <Input id="name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Cloud Inc." required />
                  </div>
                  <div>
                    <Label htmlFor="industry">Primary industry</Label>
                    <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                      {industryOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {!existingVendorId && (
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Short description of what you offer."
                  />
                </div>
              )}

              <div>
                <Label htmlFor="website">Website URL (crawled for capability extraction)</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  required
                />
              </div>

              {stage === "error" && error && (
                <div className="flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg px-3 py-2.5 text-sm text-escalated">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canSubmit || stage === "submitting"} loading={stage === "submitting"}>
                  {stage === "submitting" ? "Submitting…" : "Submit for processing"}
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
                Crawling your site feeds the Vendor Intelligence Agent, which consolidates what it finds into your
                Solution DNA draft — you&apos;re taken to the review screen automatically once it&apos;s done.
              </p>
            </CardContent>
          </Card>
          {existingVendorId && (
            <Card>
              <CardContent className="flex items-start gap-2.5 pt-5 text-sm text-muted">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                Registered vendor: <span className="ml-1 font-mono text-xs text-foreground">{existingVendorId}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
