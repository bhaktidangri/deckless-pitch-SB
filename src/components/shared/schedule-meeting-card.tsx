"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, CheckCheck, Download, ExternalLink, MousePointerClick, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scheduleMeetingDirect } from "@/lib/api/account";
import { getMeetingRequestsForVendor, type VendorMeetingRequestRow } from "@/lib/api/vendor-frontier";
import { downloadIcs } from "@/lib/ics";
import { formatRelativeTime } from "@/lib/utils";

interface ScheduleMeetingCardProps {
  vendorId: string;
  buyerId: string;
  buyerCompanyName: string;
  buyerEmail: string | null;
  vendorCompanyName: string;
  vendorEmail: string | null;
}

const durationOptions = [15, 30, 45, 60, 90];

// Schedules a meeting straight to "scheduled" (no waiting on a buyer request
// first), logs it in meeting_requests for both portals' dashboards, and —
// when SENDGRID_API_KEY is configured server-side — sends the buyer a real
// invite email with a .ics attachment. Always also downloads the .ics
// locally and offers a mailto: fallback, so the buyer still gets something
// to add to their calendar even before real delivery is configured.
export function ScheduleMeetingCard({ vendorId, buyerId, buyerCompanyName, buyerEmail, vendorCompanyName, vendorEmail }: ScheduleMeetingCardProps) {
  const [title, setTitle] = useState(`${vendorCompanyName} <> ${buyerCompanyName} discussion`);
  // Default to "tomorrow, on the hour" — computed in an effect (not during
  // render) since Date.now() is impure and the rules of React forbid impure
  // calls in the render path; an empty initial value just means the picker
  // briefly shows blank before this fills in.
  const [dateTime, setDateTime] = useState("");
  useEffect(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    setDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, []);
  const [duration, setDuration] = useState(30);
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [history, setHistory] = useState<VendorMeetingRequestRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMeetingRequestsForVendor(vendorId)
      .then((rows) => {
        if (!cancelled) setHistory(rows.filter((r) => r.buyerId === buyerId));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId, buyerId]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduling(true);
    setError(null);
    setScheduled(false);
    try {
      const proposedDate = new Date(dateTime).toISOString();
      const result = await scheduleMeetingDirect({
        buyerId,
        title: title.trim(),
        proposedDate,
        durationMinutes: duration,
        meetingLink: meetingLink.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setHistory((prev) => [
        {
          id: result.meetingRequestId,
          buyerId,
          status: "scheduled",
          proposedDate: result.proposedDate,
          expert: null,
          unresolvedCount: 0,
          title: result.title,
          notes: result.notes,
          meetingLink: result.meetingLink,
          durationMinutes: result.durationMinutes,
          createdAt: result.proposedDate,
          inviteEmailStatus: result.inviteEmailStatus,
          inviteOpenedAt: null,
          inviteClickedAt: null,
        },
        ...prev,
      ]);
      setScheduled(true);

      // Always download locally too — a real send doesn't guarantee the
      // buyer's client renders the .ics attachment the way they'd expect,
      // and this costs nothing extra.
      downloadIcs(
        {
          uid: `${result.meetingRequestId}@deckless-pitch`,
          title: title.trim(),
          description: notes.trim() || undefined,
          location: meetingLink.trim() || undefined,
          startIso: proposedDate,
          durationMinutes: duration,
          organizerEmail: vendorEmail,
          attendeeEmail: result.buyerEmail,
        },
        `${title.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "meeting"}.ics`
      );

      // Only fall back to mailto: when a real invite email wasn't actually
      // sent (no provider configured yet, or the send failed) — otherwise
      // the buyer would get the meeting twice.
      if (result.buyerEmail && result.inviteEmailStatus !== "sent") {
        const when = new Date(proposedDate).toLocaleString();
        const bodyLines = [
          `Hi ${buyerCompanyName} team,`,
          "",
          `We've scheduled a meeting: ${title.trim()}`,
          `When: ${when} (${duration} min)`,
          meetingLink.trim() ? `Join: ${meetingLink.trim()}` : "",
          notes.trim() ? `\n${notes.trim()}` : "",
          "",
          `A calendar invite (.ics) was just downloaded — attach it to this email or import it into your calendar.`,
          "",
          `— ${vendorCompanyName}`,
        ].filter(Boolean);
        window.location.href = `mailto:${result.buyerEmail}?subject=${encodeURIComponent(title.trim())}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule this meeting.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Schedule a meeting
        </CardTitle>
        <CardDescription>
          {buyerEmail
            ? `Schedules directly, downloads a calendar invite, and opens your email client addressed to ${buyerEmail}.`
            : "Schedules directly and downloads a calendar invite — this buyer hasn't linked a login email yet, so no mailto: is opened."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSchedule} className="space-y-3">
          <div>
            <Label htmlFor="meeting-title">Title</Label>
            <Input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="meeting-when">Date &amp; time</Label>
              <Input id="meeting-when" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="meeting-duration">Duration</Label>
              <Select id="meeting-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {durationOptions.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="meeting-link">Meeting link (optional)</Label>
            <Input id="meeting-link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <Label htmlFor="meeting-notes">Agenda / notes (optional)</Label>
            <Textarea id="meeting-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-escalated">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={scheduling} disabled={scheduling}>
              <Send className="h-4 w-4" /> Schedule &amp; send
            </Button>
            {scheduled && (
              <span className="text-sm text-verified">
                Scheduled — invite downloaded{history[0]?.inviteEmailStatus === "sent" ? " and emailed." : "."}
              </span>
            )}
          </div>
        </form>

        {!historyLoading && history.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Meetings with this buyer</p>
            <div className="space-y-2.5">
              {history.slice(0, 5).map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{m.title ?? "Meeting"}</p>
                    <Badge variant={m.status === "scheduled" ? "modelled" : m.status === "completed" ? "verified" : "outline"} size="sm" className="capitalize">
                      {m.status}
                    </Badge>
                  </div>
                  {m.proposedDate && (
                    <p className="mt-1 text-xs text-muted">
                      {new Date(m.proposedDate).toLocaleString()} · {m.durationMinutes} min · {formatRelativeTime(m.createdAt)}
                    </p>
                  )}
                  {(m.inviteEmailStatus === "sent" || m.inviteOpenedAt || m.inviteClickedAt) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.inviteEmailStatus === "sent" && (
                        <Badge variant="verified" size="sm" className="gap-1">
                          <CheckCheck className="h-3 w-3" /> Invite sent
                        </Badge>
                      )}
                      {m.inviteOpenedAt && <Badge variant="brand" size="sm">Opened</Badge>}
                      {m.inviteClickedAt && (
                        <Badge variant="modelled" size="sm" className="gap-1">
                          <MousePointerClick className="h-3 w-3" /> Clicked
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {m.meetingLink && (
                      <a href={m.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                        <ExternalLink className="h-3 w-3" /> Join link
                      </a>
                    )}
                    {m.proposedDate && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadIcs(
                            {
                              uid: `${m.id}@deckless-pitch`,
                              title: m.title ?? "Meeting",
                              description: m.notes ?? undefined,
                              location: m.meetingLink ?? undefined,
                              startIso: m.proposedDate!,
                              durationMinutes: m.durationMinutes,
                              organizerEmail: vendorEmail,
                              attendeeEmail: buyerEmail,
                            },
                            `${(m.title ?? "meeting").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> Download .ics
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
