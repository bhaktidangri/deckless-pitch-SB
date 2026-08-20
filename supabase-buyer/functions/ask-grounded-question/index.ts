// The real implementation behind /buyer/chat's own stated promise ("Every
// answer is checked against verified evidence before it reaches you. If
// nothing supports a confident answer, the AI says so — and routes it to a
// specialist instead of guessing") — that copy already existed; nothing
// behind it ever actually enforced it. This is a RAG pipeline, not a call
// to the Yoxa agent's query_workspace_evidence HITL node (that node's real
// resume contract for free text is unconfirmed — see live-chat-panel.tsx's
// own header comment — and this needs to reliably work today):
//
//   1. Embed the question (Supabase.ai.Session("gte-small"), same as
//      search-vendor-capabilities — no external embedding key).
//   2. pgvector-match it against ONLY this buyer's selected vendor's
//      published solution_capabilities (match_solution_capabilities with
//      filter_vendor_id, from the grounded_chat migration).
//   3. Pull the real solution_evidence backing each matched capability.
//   4. Ask Gemini to answer using ONLY that evidence, as structured JSON
//      (status/answer/citedCapabilityIds/reasonUnresolved) — no free-text
//      parsing of "is this uncertain" guesswork.
//   5. status="escalated" (evidence doesn't support a confident answer) ->
//      write a capability_frontier row instead of a made-up answer, reusing
//      the entire existing vendor-review pipeline (FrontierCard,
//      resolve-capability-frontier-item, /buyer/handoff) untouched. A
//      trigram-similarity check against this buyer+vendor's own open items
//      (find_similar_open_frontier_item) skips creating a duplicate if the
//      question's already outstanding.
//   6. Both the buyer's question and the answer are written straight to
//      conversations/messages — same tables the agent's own
//      save-interaction-resolution tool writes, but through a path that
//      actually runs synchronously and reliably today.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface MatchedCapability {
  id: string;
  name: string;
  description: string | null;
  category: string;
  verification_status: string;
  tags: string[];
  similarity: number;
}

interface EvidenceRow {
  capability_id: string;
  source_label: string | null;
  source_text: string | null;
  source_location: string | null;
}

interface GeminiAnswer {
  status: "verified" | "modelled" | "escalated";
  answer: string;
  citedCapabilityIds: string[];
  reasonUnresolved: string | null;
}

function buildPrompt(opts: {
  vendorName: string;
  vendorTagline: string | null;
  vendorDescription: string | null;
  buyerCompanyName: string;
  question: string;
  capabilities: MatchedCapability[];
  evidenceByCapability: Map<string, EvidenceRow[]>;
  requirements: string[];
  history: { role: string; content: string }[];
}): string {
  const evidenceBlock =
    opts.capabilities.length === 0
      ? "(No published capabilities matched this question closely enough to be usable evidence.)"
      : opts.capabilities
          .map((c) => {
            const evidence = opts.evidenceByCapability.get(c.id) ?? [];
            const quotes = evidence
              .slice(0, 2)
              .map((e) => `    - "${e.source_text ?? ""}" (${e.source_label ?? "source"})`)
              .join("\n");
            return `[capabilityId: ${c.id}] ${c.name} (${c.category}, ${c.verification_status})\n  ${c.description ?? ""}\n  tags: ${c.tags.join(", ")}\n  evidence:\n${quotes || "    (no source quotes recorded)"}`;
          })
          .join("\n\n");

  const historyBlock = opts.history.length
    ? opts.history.map((m) => `${m.role === "user" ? "Buyer" : "Assistant"}: ${m.content}`).join("\n")
    : "(no prior messages)";

  return `You are the AI assistant for ${opts.vendorName}${opts.vendorTagline ? ` ("${opts.vendorTagline}")` : ""}, answering a prospective buyer's question on the vendor's behalf inside a B2B evaluation platform. The buyer is from ${opts.buyerCompanyName}.

STRICT RULE: you may only state facts explicitly supported by the EVIDENCE block below. Never invent capabilities, integrations, pricing, timelines, or any claim not present in that evidence — not even something that sounds plausible for a company like this. If the evidence doesn't clearly and specifically answer the question, you must NOT guess: set status to "escalated" instead, so a real specialist follows up.

VENDOR DESCRIPTION: ${opts.vendorDescription ?? "(not provided)"}

EVIDENCE (this vendor's own published, verified capabilities — the ONLY facts you're allowed to use):
${evidenceBlock}

BUYER'S OWN STATED REQUIREMENTS (context only, not evidence about the vendor):
${opts.requirements.length ? opts.requirements.map((r) => `- ${r}`).join("\n") : "(none captured yet)"}

RECENT CONVERSATION:
${historyBlock}

BUYER'S QUESTION: ${opts.question}

Respond with JSON only, matching this exact shape:
{
  "status": "verified" | "modelled" | "escalated",
  "answer": string,
  "citedCapabilityIds": string[],
  "reasonUnresolved": string | null
}

- "verified": the evidence directly and specifically answers the question. answer should cite what it's based on in plain language (e.g. "Yes — per their published UX research process...").
- "modelled": the evidence is relevant but requires reasonable inference to connect to the question (say so in the answer, e.g. "Based on their embedded-team service, this is likely possible, though it isn't stated explicitly...").
- "escalated": the evidence doesn't support answering this at all. answer should be a short, honest message telling the buyer this needs the vendor's own team, not an apology or hedge-everything paragraph. reasonUnresolved should explain in one sentence what's missing.
- citedCapabilityIds must only contain capabilityId values that actually appear in the EVIDENCE block above, and must be empty when status is "escalated".`;
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<GeminiAnswer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              status: { type: "STRING", enum: ["verified", "modelled", "escalated"] },
              answer: { type: "STRING" },
              citedCapabilityIds: { type: "ARRAY", items: { type: "STRING" } },
              reasonUnresolved: { type: "STRING", nullable: true },
            },
            required: ["status", "answer", "citedCapabilityIds"],
          },
          temperature: 0.2,
        },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini responded ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no text content.");
  const parsed = JSON.parse(text) as Partial<GeminiAnswer>;
  if (parsed.status !== "verified" && parsed.status !== "modelled" && parsed.status !== "escalated") {
    throw new Error("Gemini response failed schema validation (bad status).");
  }
  if (typeof parsed.answer !== "string" || !parsed.answer.trim()) {
    throw new Error("Gemini response failed schema validation (empty answer).");
  }
  return {
    status: parsed.status,
    answer: parsed.answer.trim(),
    citedCapabilityIds: Array.isArray(parsed.citedCapabilityIds) ? parsed.citedCapabilityIds.filter((x) => typeof x === "string") : [],
    reasonUnresolved: typeof parsed.reasonUnresolved === "string" ? parsed.reasonUnresolved : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 503);
  if (!geminiApiKey) return json({ error: "GEMINI_API_KEY is not configured." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }
  const buyerId = typeof body.buyerId === "string" ? body.buyerId : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  let vendorId = typeof body.vendorId === "string" ? body.vendorId : undefined;
  if (!buyerId) return json({ error: "buyerId is required." }, 400);
  if (!question) return json({ error: "question is required." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: buyer } = await admin.from("buyers").select("id, company_name").eq("id", buyerId).maybeSingle();
  if (!buyer) return json({ error: "Buyer not found." }, 404);

  if (!vendorId) {
    const { data: selection } = await admin
      .from("buyer_vendor_selections")
      .select("vendor_id")
      .eq("buyer_id", buyerId)
      .eq("is_active", true)
      .maybeSingle();
    vendorId = selection?.vendor_id;
  }
  if (!vendorId) return json({ error: "This buyer has no confirmed vendor selection yet." }, 422);

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, company_name, tagline, description")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendor) return json({ error: "Vendor not found." }, 404);

  // ---- retrieval -----------------------------------------------------
  // @ts-expect-error Supabase.ai is a Supabase Edge Runtime global, not part of standard Deno/TS lib types.
  const embedModel = new Supabase.ai.Session("gte-small");
  const queryEmbedding = (await embedModel.run(question, { mean_pool: true, normalize: true })) as number[];

  const { data: matchedCapabilities, error: matchError } = await admin.rpc("match_solution_capabilities", {
    query_embedding: queryEmbedding,
    match_count: 8,
    min_similarity: 0.35,
    filter_vendor_id: vendorId,
  });
  if (matchError) return json({ error: matchError.message }, 500);
  const capabilities = (matchedCapabilities ?? []) as MatchedCapability[];

  const capabilityIds = capabilities.map((c) => c.id);
  const evidenceByCapability = new Map<string, EvidenceRow[]>();
  if (capabilityIds.length > 0) {
    const { data: evidenceRows } = await admin
      .from("solution_evidence")
      .select("capability_id, source_label, source_text, source_location")
      .in("capability_id", capabilityIds);
    for (const row of (evidenceRows ?? []) as EvidenceRow[]) {
      const list = evidenceByCapability.get(row.capability_id) ?? [];
      list.push(row);
      evidenceByCapability.set(row.capability_id, list);
    }
  }

  const { data: requirementRows } = await admin
    .from("buyer_requirements")
    .select("requirement_text")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: true })
    .limit(8);
  const requirements = (requirementRows ?? []).map((r: { requirement_text: string }) => r.requirement_text);

  // ---- conversation + history -----------------------------------------
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  if (!conversationId) {
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("buyer_id", buyerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    conversationId = existing?.id;
  }
  if (!conversationId) {
    const { data: created, error: createError } = await admin
      .from("conversations")
      .insert({ buyer_id: buyerId, vendor_id: vendorId })
      .select("id")
      .single();
    if (createError) return json({ error: createError.message }, 500);
    conversationId = created.id;
  }

  const { data: historyRows } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(6);
  const history = ((historyRows ?? []) as { role: string; content: string }[]).reverse();

  // ---- ask Gemini, grounded only ---------------------------------------
  const prompt = buildPrompt({
    vendorName: vendor.company_name,
    vendorTagline: vendor.tagline,
    vendorDescription: vendor.description,
    buyerCompanyName: buyer.company_name,
    question,
    capabilities,
    evidenceByCapability,
    requirements,
    history,
  });

  let answer: GeminiAnswer;
  try {
    answer = await callGemini(geminiApiKey, geminiModel, prompt);
  } catch (err) {
    // The model call itself failed or returned something unparseable —
    // never fabricate an answer in this path either. Treat exactly like an
    // honest "can't answer" and still record + escalate the question.
    answer = {
      status: "escalated",
      answer: "I couldn't verify a confident answer to this right now — I've flagged it for the vendor's team to follow up on directly.",
      citedCapabilityIds: [],
      reasonUnresolved: err instanceof Error ? `Model call failed: ${err.message}` : "Model call failed.",
    };
  }
  // No evidence at all is never "verified"/"modelled" no matter what the
  // model claims — a hard backstop, not just prompt-level trust.
  if (capabilities.length === 0 && answer.status !== "escalated") {
    answer = { ...answer, status: "escalated", citedCapabilityIds: [], reasonUnresolved: answer.reasonUnresolved ?? "No matching published capabilities were found for this question." };
  }

  const citedEvidence = answer.citedCapabilityIds
    .map((id) => capabilities.find((c) => c.id === id))
    .filter((c): c is MatchedCapability => Boolean(c))
    .map((c) => ({ capabilityId: c.id, name: c.name, category: c.category, similarity: c.similarity }));

  const { data: userMessage, error: userMsgError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: question })
    .select("id, role, content, response_status, created_at")
    .single();
  if (userMsgError) return json({ error: userMsgError.message }, 500);

  const { data: assistantMessage, error: assistantMsgError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: answer.answer,
      response_status: answer.status,
      evidence: citedEvidence.length > 0 ? citedEvidence : null,
    })
    .select("id, role, content, response_status, evidence, created_at")
    .single();
  if (assistantMsgError) return json({ error: assistantMsgError.message }, 500);

  await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  // ---- auto-triage: uncertain -> capability_frontier, deduped -----------
  let frontierItemId: string | null = null;
  let frontierItemCreated = false;
  if (answer.status === "escalated") {
    const { data: similarId } = await admin.rpc("find_similar_open_frontier_item", {
      p_buyer_id: buyerId,
      p_vendor_id: vendorId,
      p_question: question,
      min_similarity: 0.55,
    });
    if (similarId) {
      frontierItemId = similarId as string;
    } else {
      const { data: solutionModel } = await admin
        .from("solution_models")
        .select("id")
        .eq("buyer_id", buyerId)
        .eq("vendor_id", vendorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: created, error: frontierError } = await admin
        .from("capability_frontier")
        .insert({
          buyer_id: buyerId,
          vendor_id: vendorId,
          solution_model_id: solutionModel?.id ?? null,
          question,
          context: `Asked in /buyer/chat. ${capabilities.length} capabilities were checked but none gave a confident answer.`,
          evidence_checked: capabilities.map((c) => c.name),
          reason_unresolved: answer.reasonUnresolved ?? "The AI assistant could not find grounded evidence to answer this.",
          status: "open",
        })
        .select("id")
        .single();
      if (!frontierError && created) {
        frontierItemId = created.id;
        frontierItemCreated = true;
      }
    }
  }

  return json({
    conversationId,
    userMessage: { id: userMessage.id, role: userMessage.role, content: userMessage.content, responseStatus: userMessage.response_status, createdAt: userMessage.created_at },
    assistantMessage: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      responseStatus: assistantMessage.response_status,
      evidence: assistantMessage.evidence,
      createdAt: assistantMessage.created_at,
    },
    frontierItemId,
    frontierItemCreated,
  });
});
