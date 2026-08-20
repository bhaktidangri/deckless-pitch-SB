"use client";

// A real, catalog-wide "search by capability" surface — reachable from
// anywhere in the buyer portal via ⌘K / Ctrl+K or the header search button.
// Before this, the only capability search in the app was the ~15-line
// filter bolted onto /buyer/vendors, and it only searched within *this
// buyer's own* recommended vendors. This searches every published vendor's
// full Solution DNA (the same query-published-vendor-solution-dna function
// the vendors page already calls), so a buyer can explore what's out there
// before or independent of their own recommendation list.
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, ChevronDown, Loader2, Search, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EvidenceBadge } from "@/components/shared/status-badge";
import { queryPublishedVendorSolutionDna, type PublishedCapability, type PublishedVendor } from "@/lib/api/buyer-vendor-dna";
import { cn } from "@/lib/utils";

function vendorMatches(vendor: PublishedVendor, q: string): boolean {
  if (!q) return true;
  const haystack = [vendor.companyName, vendor.tagline, vendor.description, vendor.industry, ...vendor.industries]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) return true;
  return vendor.capabilities.some((c) => capabilityMatches(c, q));
}

function capabilityMatches(capability: PublishedCapability, q: string): boolean {
  if (!q) return true;
  const haystack = [capability.name, capability.description, capability.category, ...capability.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function GlobalCapabilitySearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<PublishedVendor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || vendors !== null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    queryPublishedVendorSolutionDna()
      .then((res) => {
        if (!cancelled) setVendors(res.vendors);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the vendor capability catalog. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, vendors]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!vendors) return [];
    return vendors.filter((v) => vendorMatches(v, q));
  }, [vendors, q]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Search capabilities…
        <kbd className="ml-3 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-subtle">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search capabilities"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} widthClassName="w-full max-w-2xl">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Search className="h-4 w-4 shrink-0 text-subtle" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search capabilities, industries, or vendors…"
            className="h-auto border-0 px-0 py-0 focus:ring-0"
          />
        </div>

        <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the capability catalog…
            </div>
          )}
          {error && <p className="py-6 text-center text-sm text-escalated">{error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-subtle">No vendors or capabilities match &ldquo;{query}&rdquo;.</p>
          )}
          {!loading &&
            filtered.map((vendor) => {
              const matchingCapabilities = q ? vendor.capabilities.filter((c) => capabilityMatches(c, q)) : vendor.capabilities;
              const isExpanded = expandedId === vendor.vendorId;
              return (
                <div key={vendor.vendorId} className="rounded-xl border border-border bg-surface-2/60">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : vendor.vendorId)}
                    className="flex w-full items-center gap-3 p-3.5 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                      {vendor.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{vendor.companyName}</p>
                      <p className="truncate text-xs text-muted">{vendor.tagline ?? vendor.industry ?? "Vendor"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{matchingCapabilities.length} match{matchingCapabilities.length === 1 ? "" : "es"}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", isExpanded && "rotate-180")} />
                  </button>

                  {!isExpanded && (
                    <div className="flex flex-wrap gap-1.5 px-3.5 pb-3.5">
                      {matchingCapabilities.slice(0, 6).map((c) => (
                        <Badge key={c.id} variant="outline" size="sm">{c.name}</Badge>
                      ))}
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2.5 border-t border-border px-3.5 py-3.5">
                          {vendor.description && <p className="text-xs text-muted">{vendor.description}</p>}
                          {matchingCapabilities.map((c) => (
                            <div key={c.id} className="rounded-lg border border-border bg-surface p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-500" /> {c.name}
                                </p>
                                <EvidenceBadge status={c.verificationStatus} />
                              </div>
                              {c.description && <p className="mt-1.5 text-xs text-muted">{c.description}</p>}
                              {c.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {c.tags.map((t) => (
                                    <Badge key={t} variant="default" size="sm">{t}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>

        {!loading && !error && vendors && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-subtle">
            <Building2 className="h-3 w-3" /> Searching {vendors.length} published vendor{vendors.length === 1 ? "" : "s"} and their full Solution DNA.
          </p>
        )}
      </Modal>
    </>
  );
}
