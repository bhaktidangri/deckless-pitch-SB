"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Dna,
  Download,
  FileText,
  Handshake,
  Layers,
  Loader2,
  PartyPopper,
  Plug,
  Puzzle,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { EvidenceBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  queryDraftVendorCapabilities,
  VendorDnaApiError,
  type SavedCapability,
} from "@/lib/api/vendor-dna";
import {
  clearPendingSubmission,
  getPendingSubmission,
  getStoredVendorId,
  setStoredVendorId,
  setStoredVendorName,
} from "@/lib/vendor-session";
import { getVendorKnowledgeDocument, type VendorKnowledgeDocument } from "@/lib/api/vendor-knowledge";
import {
  KNOWLEDGE_POLL_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  pollForKnowledgeDocument,
  pollForNewCapabilities,
  pollForNewVendorId,
  type PollHandle,
} from "@/lib/vendor-poll";

// Milestone 2 ("Review and Publish Vendor Solution DNA") no longer has a
// human-in-the-loop step — the Vendor Intelligence Agent queries the draft
// capabilities, decides each one's verificationStatus itself, publishes
// immediately, and generates the buyer-facing knowledge PPTX, all without
// waiting on the vendor. This screen is now a read-only status view: it
// shows live capability status as the agent works through them, then
// surfaces the generated knowledge deck once it's ready. There is
// deliberately no approve/revise/reject/publish UI here anymore.
type Stage = "need-vendor-id" | "loading" | "error" | "status";

const categoryLabel: Record<string, string> = {
  product: "Product",
  service: "Service",
  solution: "Solution",
  feature: "Feature",
  integration: "Integration",
  industry: "Industry",
  consulting: "Consulting",
  use_case: "Use case",
  constraint: "Constraint",
};

const categoryIcon: Record<string, React.ElementType> = {
  product: Puzzle,
  service: Wrench,
  solution: Layers,
  feature: Sparkles,
  integration: Plug,
  industry: Building2,
  consulting: Handshake,
  use_case: Target,
  constraint: ShieldAlert,
};

export default function SolutionDnaPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorIdInput, setVendorIdInput] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("need-vendor-id");
  const [error, setError] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<SavedCapability[]>([]);
  const [knowledgeDoc, setKnowledgeDoc] = useState<VendorKnowledgeDocument | null>(null);
  const [knowledgePolling, setKnowledgePolling] = useState(false);
  const knowledgePollRef = useRef<PollHandle | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCapabilities(id: string) {
    pollHandleRef.current?.cancel();
    setAutoPolling(false);
    clearPendingSubmission();
    setStage("loading");
    setError(null);
    try {
      const result = await queryDraftVendorCapabilities(id);
      setVendorId(result.vendorId);
      setCompanyName(result.companyName);
      setStoredVendorId(result.vendorId);
      setStoredVendorName(result.companyName);
      setCapabilities(result.capabilities);
      setStage("status");

      const existingDoc = await getVendorKnowledgeDocument(result.vendorId).catch(() => null);
      if (existingDoc) {
        setKnowledgeDoc(existingDoc);
      } else {
        startKnowledgePolling(result.vendorId);
      }
    } catch (e) {
      setError(e instanceof VendorDnaApiError ? e.message : "Could not load draft capabilities.");
      setStage("error");
    }
  }

  // Polls both the knowledge deck (terminal event of Milestone 2) and the
  // capability list itself (so verificationStatus badges update live as the
  // agent works through Query -> decide -> Publish), on the same interval,
  // until the deck shows up or the budget runs out.
  function startKnowledgePolling(id: string) {
    knowledgePollRef.current?.cancel();
    setKnowledgePolling(true);
    const deadline = Date.now() + KNOWLEDGE_POLL_TIMEOUT_MS;

    const refreshCapabilities = async () => {
      try {
        const result = await queryDraftVendorCapabilities(id);
        setCapabilities(result.capabilities);
      } catch {
        // transient — the deck poll below drives its own retry/timeout
      }
    };
    const interval = setInterval(refreshCapabilities, POLL_INTERVAL_MS);

    knowledgePollRef.current = pollForKnowledgeDocument(
      id,
      deadline,
      (doc) => {
        clearInterval(interval);
        setKnowledgeDoc(doc);
        setKnowledgePolling(false);
        refreshCapabilities();
      },
      () => {
        clearInterval(interval);
        setKnowledgePolling(false);
      }
    );
  }

  useEffect(() => () => knowledgePollRef.current?.cancel(), []);

  if (stage === "need-vendor-id" || (stage === "error" && !vendorId)) {
    return (
      <div>
        <PageHeader
          eyebrow="Milestone 2 — Review and Publish Vendor Solution DNA"
          title="Solution DNA status"
          description="Once your sources are submitted and a vendor is registered, this screen tracks your Solution DNA automatically — no review step needed."
        />
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-5">
            {autoPolling ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2.5 text-sm text-foreground dark:border-brand-900 dark:bg-brand-950/20">
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600 dark:text-brand-400" />
                <span>
                  Your Milestone 1 submission is still processing — this screen checks automatically and loads your
                  status the moment it&apos;s ready.
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No vendor is loaded in this browser yet. If you already registered via{" "}
                <Link href="/vendor/profile" className="text-brand-600 underline dark:text-brand-400">
                  the intake form
                </Link>
                , paste your vendor ID below to resume.
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
              Load status <ArrowRight className="h-4 w-4" />
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
        <p className="text-sm text-muted">Loading Solution DNA status…</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div>
        <PageHeader eyebrow={companyName ?? undefined} title="Solution DNA status" />
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

  const verifiedCount = capabilities.filter((c) => c.verificationStatus === "verified").length;
  const modelledCount = capabilities.filter((c) => c.verificationStatus === "modelled").length;
  const pendingCount = capabilities.filter((c) => c.verificationStatus === "pending").length;
  const evidenceCount = capabilities.reduce((sum, c) => sum + c.evidence.length, 0);

  const categoriesPresent = Array.from(new Set(capabilities.map((c) => c.category)));

  const filteredCapabilities = capabilities.filter((c) => {
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        eyebrow={`${companyName ?? "Vendor"} · Milestone 2`}
        title="Solution DNA status"
        description="Your Vendor Intelligence Agent reviews, publishes, and builds your buyer-facing knowledge deck automatically — nothing to approve here."
      />

      {knowledgeDoc ? (
        <Card className="mb-6 border-verified-border bg-verified-bg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-5 w-5 text-verified" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {knowledgeDoc.status === "ready" ? "Your Vendor Knowledge Deck is ready" : "Knowledge deck generation failed"}
                </p>
                <p className="text-xs text-muted">{knowledgeDoc.title ?? "Vendor Knowledge Deck"}</p>
              </div>
            </div>
            {knowledgeDoc.pptxUrl && (
              <a
                href={knowledgeDoc.pptxUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <Download className="h-3.5 w-3.5" /> Download PPTX
              </a>
            )}
          </CardContent>
        </Card>
      ) : (
        // Once every capability has a real (non-"pending") verificationStatus,
        // the decide/publish step is done even if the PPTX deck is still
        // being generated — so this banner shouldn't keep claiming
        // "deciding... publishing" is still in progress.
        knowledgePolling &&
        pendingCount > 0 && (
          <Card className="mb-6 border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardContent className="flex items-center gap-2.5 pt-5 text-sm text-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600 dark:text-brand-400" />
              Your agent is deciding on each capability, publishing, and building your knowledge deck — this screen
              updates automatically.
            </CardContent>
          </Card>
        )
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total capabilities" value={String(capabilities.length)} icon={Dna} tone="brand" index={0} />
        <StatCard label="Verified" value={String(verifiedCount)} icon={CheckCircle2} tone="verified" index={1} />
        <StatCard label="Modelled" value={String(modelledCount)} icon={Sparkles} tone="modelled" index={2} />
        <StatCard
          label={pendingCount > 0 ? "Still pending" : "Evidence sources"}
          value={String(pendingCount > 0 ? pendingCount : evidenceCount)}
          icon={pendingCount > 0 ? AlertTriangle : BookOpen}
          tone={pendingCount > 0 ? "escalated" : "accent"}
          index={3}
        />
      </div>

      {capabilities.length === 0 ? (
        <Card className="mt-6 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No draft capabilities on file for this vendor yet.</p>
        </Card>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search capabilities…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
                All <span className="opacity-60">{capabilities.length}</span>
              </FilterChip>
              {categoriesPresent.map((cat) => {
                const Icon = categoryIcon[cat] ?? Layers;
                const count = capabilities.filter((c) => c.category === cat).length;
                return (
                  <FilterChip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>
                    <Icon className="h-3 w-3" /> {categoryLabel[cat] ?? cat} <span className="opacity-60">{count}</span>
                  </FilterChip>
                );
              })}
            </div>
          </div>

          {filteredCapabilities.length === 0 ? (
            <Card className="mt-4 p-6 text-center">
              <p className="text-sm text-muted">No capabilities match your search.</p>
            </Card>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {filteredCapabilities.map((cap) => {
                const CategoryIcon = categoryIcon[cap.category] ?? Layers;
                const expanded = expandedIds.has(cap.id);
                return (
                  <Card key={cap.id} className="overflow-hidden p-0 transition-shadow hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-black/20">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                                {categoryLabel[cap.category] ?? cap.category}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{cap.name}</p>
                            {cap.description && <p className="mt-0.5 text-sm text-muted">{cap.description}</p>}
                          </div>
                        </div>
                        <EvidenceBadge status={cap.verificationStatus} className="shrink-0" />
                      </div>

                      {cap.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cap.tags.map((tag) => (
                            <Badge key={tag} variant="outline" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {cap.evidence.length > 0 && (
                      <div className="border-t border-border">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cap.id)}
                          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {cap.evidence.length} evidence source{cap.evidence.length === 1 ? "" : "s"}
                          </span>
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        </button>
                        {expanded && (
                          <div className="space-y-2 bg-surface-2/60 px-4 pb-3 pt-1">
                            {cap.evidence.map((ev, i) => (
                              <div key={ev.id ?? i} className="rounded-lg border border-border bg-surface p-2.5 text-xs">
                                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-muted">
                                  {ev.sourceType && (
                                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium uppercase tracking-wide">
                                      {ev.sourceType}
                                    </span>
                                  )}
                                  {ev.sourceLabel && <span className="font-medium text-foreground">{ev.sourceLabel}</span>}
                                </div>
                                {ev.sourceText && <p className="text-muted">{ev.sourceText}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300"
          : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
