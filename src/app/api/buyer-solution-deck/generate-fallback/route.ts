import { NextResponse } from "next/server";
import { collectPitchDeckData, DeckDataError } from "@/lib/pitch-deck/collect-deck-data";
import { buildBuyerPitchDeck } from "@/lib/pitch-deck/build-deck";

// Backup path for the buyer's Solution Pitch Deck: builds a real .pptx
// straight from Supabase (the same tables /buyer/solution reads for its
// live view) instead of waiting on Yoxa's own "Generate Solution Pitch
// Deck" Output Tool, whose webhook delivery has not been reliable — every
// buyer_solution_decks row recorded so far via that path is status=failed.
// Runs the actual pptxgenjs build in Node (not the edge runtime) since
// pptxgenjs needs Buffer/fs-style APIs, then hands the finished bytes to
// the existing save-buyer-solution-deck edge function (source: "fallback")
// so upload + row insert stay on the one proven code path both origins use.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { buyerId?: string; vendorId?: string };
  const buyerId = body.buyerId;
  if (!buyerId) {
    return NextResponse.json({ error: "buyerId is required." }, { status: 400 });
  }

  let deckData;
  try {
    deckData = await collectPitchDeckData(buyerId, body.vendorId ?? null);
  } catch (err) {
    if (err instanceof DeckDataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not read solution data from Supabase." }, { status: 502 });
  }

  let fileBase64: string;
  try {
    const buffer = await buildBuyerPitchDeck(deckData);
    fileBase64 = buffer.toString("base64");
  } catch {
    return NextResponse.json({ error: "Deck generation failed while assembling the .pptx." }, { status: 500 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const safeCompanyName = deckData.vendor.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const res = await fetch(`${functionsUrl}/functions/v1/save-buyer-solution-deck`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      buyerId,
      vendorId: deckData.vendor.id,
      solutionModelId: deckData.model?.id,
      title: `${deckData.vendor.companyName} — Solution Pitch Deck`,
      fileBase64,
      fileName: `${safeCompanyName}-solution-pitch-deck.pptx`,
      source: "fallback",
    }),
  });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(data, { status: res.status });
}
