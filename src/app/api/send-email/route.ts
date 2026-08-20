import { NextResponse } from "next/server";

// Server-only SendGrid relay, replacing the mailto:-based "send" used by
// EmailBuyerCard and ScheduleMeetingCard — those opened the vendor's own
// email client instead of actually delivering anything. This is a real,
// backend-relayed send: SENDGRID_API_KEY never reaches the browser, and
// delivery doesn't depend on the vendor's own mail client being configured.
const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

interface SendEmailBody {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: string; type?: string }[];
}

export async function POST(req: Request) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: "Email sending isn't configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL missing)." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SendEmailBody>;
  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const text = body.text?.trim();
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "to, subject, and text are required." }, { status: 400 });
  }

  const res = await fetch(SENDGRID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: "Deck-less Pitch" },
      subject,
      content: [{ type: "text/plain", value: text }],
      attachments: body.attachments,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("send-email: SendGrid rejected the request.", res.status, errorBody);
    return NextResponse.json({ error: "Could not send the email.", sendgridStatus: res.status }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
