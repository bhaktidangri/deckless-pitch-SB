// Minimal RFC 5545 .ics builder — no dependency needed for a single VEVENT.
// Used everywhere a scheduled meeting needs to become a downloadable
// calendar invite: this app has no transactional email provider, so an .ics
// file plus a mailto: link (see ScheduleMeetingCard) is the real, working
// substitute for a backend-sent calendar invite.

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  durationMinutes: number;
  organizerEmail?: string | null;
  attendeeEmail?: string | null;
}

function toIcsDate(iso: string): string {
  // UTC, basic format: YYYYMMDDTHHMMSSZ
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsContent(event: IcsEventInput): string {
  const start = toIcsDate(event.startIso);
  const end = toIcsDate(new Date(new Date(event.startIso).getTime() + event.durationMinutes * 60 * 1000).toISOString());
  const stamp = toIcsDate(new Date(event.startIso).toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deckless Pitch//Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.organizerEmail) lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  if (event.attendeeEmail) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${event.attendeeEmail}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(event: IcsEventInput, filename = "meeting.ics") {
  const content = buildIcsContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
