// Normalizes several already-real, role-scoped reads (capability frontier,
// meeting requests, workflow-run completions, recommendations, audit events)
// into one flat feed for NotificationsMenu — replacing the previous static,
// hardcoded 3-item fake array that was shown identically to every role.

import { getCapabilityFrontierItems, getMeetingRequests, getBuyerWorkflowRunHistory, getVendorOutreachEventsForBuyer } from "@/lib/api/buyer-lookup";
import { getFrontierItemsForVendor, getMeetingRequestsForVendor } from "@/lib/api/vendor-frontier";
import { getVendorRecommendationsForVendor, getBuyersByIds, getAllVendors } from "@/lib/api/vendor-lookup";
import { getAuditEvents, getRecentOrganizations } from "@/lib/api/admin-lookup";

export interface NotificationItem {
  id: string;
  tone: "escalated" | "brand" | "verified" | "modelled";
  title: string;
  detail: string;
  time: string; // ISO timestamp, formatted at render time
}

function sortAndCap(items: NotificationItem[], limit: number): NotificationItem[] {
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, limit);
}

export async function getBuyerNotifications(buyerId: string): Promise<NotificationItem[]> {
  const [frontier, meetings, runs, outreach] = await Promise.all([
    getCapabilityFrontierItems(buyerId).catch(() => []),
    getMeetingRequests(buyerId).catch(() => []),
    getBuyerWorkflowRunHistory(buyerId, 5).catch(() => []),
    getVendorOutreachEventsForBuyer(buyerId).catch(() => []),
  ]);

  const vendors = outreach.length > 0 ? await getAllVendors().catch(() => []) : [];
  const vendorNameOf = (id: string) => vendors.find((v) => v.id === id)?.companyName ?? "A vendor";

  const items: NotificationItem[] = [];
  for (const o of outreach) {
    items.push({ id: `outreach-${o.id}`, tone: "brand", title: "A vendor reached out", detail: `${vendorNameOf(o.vendorId)}: ${o.subject ?? "New message"}`, time: o.createdAt });
  }
  for (const f of frontier) {
    if (f.status === "vendor_review" || f.status === "vendor_answered" || f.status === "resolved") {
      items.push({
        id: `frontier-${f.id}`,
        tone: f.status === "resolved" ? "verified" : "brand",
        title: f.status === "resolved" ? "Question resolved" : "Vendor responded",
        detail: f.question,
        time: f.createdAt,
      });
    } else {
      items.push({ id: `frontier-${f.id}`, tone: "escalated", title: "Open question", detail: f.question, time: f.createdAt });
    }
  }
  for (const m of meetings) {
    if (m.status === "scheduled") {
      items.push({ id: `meeting-${m.id}`, tone: "verified", title: "Meeting confirmed", detail: m.expert ? `With ${m.expert}` : "Discussion scheduled", time: m.proposedDate ?? new Date().toISOString() });
    }
  }
  for (const r of runs) {
    if (r.status === "completed") {
      items.push({ id: `run-${r.id}`, tone: "verified", title: "Your solution is ready", detail: "A new run finished — check your solution workspace.", time: r.completedAt ?? r.startedAt });
    } else if (r.status === "failed") {
      items.push({ id: `run-${r.id}`, tone: "escalated", title: "A run failed", detail: "Something went wrong generating your solution.", time: r.startedAt });
    }
  }
  return sortAndCap(items, 8);
}

export async function getVendorNotifications(vendorId: string): Promise<NotificationItem[]> {
  const [frontier, meetings, recs] = await Promise.all([
    getFrontierItemsForVendor(vendorId).catch(() => []),
    getMeetingRequestsForVendor(vendorId).catch(() => []),
    getVendorRecommendationsForVendor(vendorId).catch(() => []),
  ]);

  const buyerIds = Array.from(new Set([...frontier.map((f) => f.buyerId), ...meetings.map((m) => m.buyerId), ...recs.map((r) => r.buyerId)]));
  const buyers = buyerIds.length > 0 ? await getBuyersByIds(buyerIds).catch(() => []) : [];
  const nameOf = (id: string) => buyers.find((b) => b.id === id)?.companyName ?? "A buyer";

  const items: NotificationItem[] = [];
  for (const f of frontier) {
    if (f.status === "open") {
      items.push({ id: `frontier-${f.id}`, tone: "escalated", title: "New capability question", detail: `${nameOf(f.buyerId)}: ${f.question}`, time: f.createdAt });
    }
  }
  for (const m of meetings) {
    if (m.status === "requested") {
      items.push({ id: `meeting-${m.id}`, tone: "brand", title: "Meeting requested", detail: `${nameOf(m.buyerId)} wants a live discussion`, time: m.createdAt });
    }
  }
  for (const r of recs) {
    items.push({ id: `rec-${r.id}`, tone: "modelled", title: "Buyer exploring your solution", detail: `${nameOf(r.buyerId)} — ${r.fitScore ?? 0}% fit`, time: new Date().toISOString() });
  }
  return sortAndCap(items, 8);
}

export async function getAdminNotifications(): Promise<NotificationItem[]> {
  const [events, orgs] = await Promise.all([getAuditEvents(6).catch(() => []), getRecentOrganizations(4).catch(() => [])]);
  const items: NotificationItem[] = [];
  for (const e of events) {
    items.push({
      id: `audit-${e.id}`,
      tone: e.confidence === "escalated" ? "escalated" : e.confidence === "verified" ? "verified" : "modelled",
      title: e.action,
      detail: `${e.agentName} · ${e.entityName}`,
      time: e.timestamp,
    });
  }
  for (const o of orgs) {
    items.push({ id: `org-${o.id}`, tone: "brand", title: `New ${o.type} organization`, detail: o.name, time: o.createdAt });
  }
  return sortAndCap(items, 8);
}
