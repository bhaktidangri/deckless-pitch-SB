# Deck-less Pitch — Buyer Workflow Integration PRD

**Source of truth:** Yoxa.ai use case *"Deck-less Pitch — Buyer Solution Platform"*, workflow **"Workflow Buyer Discovery To Handoff"**, latest saved version **v10** (Design mode), Release readiness: Configuration Checklist 100%, Connect required tools 12/12, workflow test passed — **Ready for Integration**.

**Companion workflow:** the vendor-side workflow ("Deck-less Pitch — Vendor-Side-Workflow") is already integrated. This document covers the **buyer side only**, and calls out every point where the buyer workflow hands off to, or depends on, the vendor side.

**Backend:** Supabase project `rrtmvsfpzurafzycjboz` ("deckless-pitch"). All persistence tools below are backed by real, deployed Supabase Edge Functions (`verify_jwt: false`, no auth header required) reconciled against actual source code and the live `public` schema — not simulated/assumed behavior.

This document exists so the frontend team can wire up the right page, the right input control (button vs. free-text vs. slider vs. file), and the right API call at every point the workflow touches the buyer-facing website, without having to reverse-engineer the Yoxa builder.

---

## 1. How to read this document

For every workflow node (trigger, step, agent, tool) this PRD records, verbatim from the Yoxa builder:

- **Title** — the exact node name shown on the canvas.
- **Select Action / node type** — the Yoxa primitive backing it (see §2 for what each type can and cannot do).
- **Instructions / Description** — the exact text an operator or agent sees, reproduced in full (not paraphrased), because the phrasing encodes real behavioral rules (ordering, escalation conditions, what counts as a failure vs. an expected state).
- **Data in / Data out** — request and response shape, sourced from the actual Supabase Edge Function OpenAPI contracts already validated and connected in Yoxa's Release → API Configuration screen, or from the Supabase table(s) touched.
- **Frontend implication** — which page/route the node reads from or writes to, and what UI control it implies, drawn from explicit mentions in the instructions text (e.g. "this feeds the /buyer/vendors grid").

§8 collects every cross-cutting integration risk found while extracting this — please read it before scoping engineering work, since several nodes' instructions describe behavior the current tool wiring cannot actually deliver.

---

## 2. Yoxa node types used in this workflow

| Select Action | What it can do | What it CANNOT do |
|---|---|---|
| **Simulated Output** (`simulated_tool`) | Calls a real Supabase Edge Function (POST, JSON body/response) and persists data. This is a genuine API call, not a mock, despite the name. | N/A — this is the "real work" tool type. |
| **Ask Human for Approval** (`human_approval`) | Presents the buyer/user a fixed set of buttons (2–4 options plus optional "Other") and waits for one click. | **Cannot receive freely typed text.** There is no text box. If a tool of this type is described as "wait for the buyer to type a question," it will hang forever — this exact bug appears three times in this workflow (§8.1). |
| **Output Tool** (`output_tool`) | Renders and hands off a generated file — here, always `pptx` (PowerPoint). | Not a data-persistence call; the underlying data model is still saved separately via the tool's own Simulated-Output-style side effect. |
| **Platform Email** | Sends an email via Yoxa's own mail sending, to either a fixed recipient or one the agent selects at runtime. | Currently configured in this workflow with a **fixed test recipient** (see §8.5) — must be switched to a dynamic vendor email before production. |

---

## 3. Frontend route map (derived from tool instructions)

These routes are referenced by name inside the tool instructions text below — they are the pages this workflow's steps are described as reading from or writing to. Treat this as the buyer-facing IA to build against, not an assumption:

| Route | Fed by / reads from |
|---|---|
| `/buyer/discover` | Trigger intake form (text or file) + optional structured business-context fields; also the live-building ClientRealityProfile panel during adaptive questioning |
| `/buyer/requirements` | `Capture Initial Requirement Summary` → `RequirementCard` list |
| `/buyer/vendors` | `Save Vendor Recommendation Ranking` → `VendorMatchCard` grid (fitScore, keyMatch, industries) |
| `/buyer/vendors/[id]` | Selected-vendor detail, driven by the confirmed `vendorId` |
| `/buyer/solution` | Interactive Workspace tab: gap cards, match rows, `SolutionModel` browsing (still backed even though the deliverable handed to the buyer is the `.pptx`) |
| `/buyer/scenarios` | Sliders (users, timelineMonths, currentCostAnnual) pre-filled from the current `SolutionModel`, live chart, and an **embedded chat panel** — explicitly flagged to replace today's fixed-formula client-side math with real agent output (§8.6) |
| `/buyer/chat` | Main grounded Q&A conversation surface; per-message `responseStatus` tag (verified / modelled / escalated) |
| `/buyer/handoff` | Scheduling state for a vendor discussion meeting |
| `/vendor/capability-frontier` | Vendor-side inbox of unresolved buyer questions (`CapabilityFrontierItem`), status `open → vendor_review → vendor_answered/resolved` |
| `/vendor/meetings` | Vendor-side inbox of `MeetingRequest` records |

---

## 4. Trigger

### `buyer_requirement_submission`

- **Input Mode:** Text input **or** File input (toggle in Yoxa; frontend must support both a free-text problem statement and a file upload as alternate entry points)
- **Description (verbatim):** "A buyer submits their initial requirement -- text or file -- kicking off the full journey: requirement capture, vendor recommendation, vendor confirmation, adaptive discovery, fit/gap assessment, personalized solution generation, and grounded exploration with human handoff."
- **Frontend implication:** this is the `/buyer/discover` intake form submit action. The payload is referred to throughout the workflow as the `buyer_requirement_submission` payload and is read directly by the very first tool (no separate "confirm capture" step — see step 1).

---

## 5. Step-by-step breakdown

### Step 1 — Understand Buyer Requirement

**Agent: Buyer Discovery Agent**
> *Persona (global):* "You are the Buyer Discovery Agent. You understand a buyer's business problem and current reality through adaptive, minimal questioning — never a fixed 20-question form. You ask only what is still relevant given what you already know, and you drop questions that have become irrelevant based on prior answers. Your tone is sharp, concise, and respectful of the buyer's time. You produce structured business profiles, not conversation transcripts."

**Step Instructions (verbatim):**
> "Create one deliverable: an initial set of Requirement records built from the buyer's structured intake submission -- the required problem statement plus any optional business-context fields (current systems, cost, users, timeline, compliance) the buyer chose to fill in on the form. Run 'Capture Initial Requirement Summary' once to parse the submission directly into Requirement records -- each requirement's text, Priority (high/medium/low), and source (buyer_input or ai_inferred) -- setting status to captured. This runs automatically with no buyer confirmation needed: the buyer already submitted this data once on the form, so do not pause or ask them to re-approve capturing what they just told you. Do not infer requirements the buyer has not stated or implied; tag anything genuinely inferred with source ai_inferred rather than buyer_input, and leave a field out entirely rather than guessing a number or detail the buyer never gave. If optional fields were left blank, do not try to interview the buyer for them here: leave those fields absent from this step's Requirements and let 'Build Client Reality Profile' (later in the flow) handle them, where they're either already filled from the website or recorded as unknown/unresolved. These Requirements populate the buyer's /buyer/requirements list and are the first input 'Recommend Vendors' compares against -- keep each one atomic (one distinct need per record, not a paragraph) so it renders as its own RequirementCard and can be matched independently."

#### Tool: Capture Initial Requirement Summary
- **Type:** Simulated Output → `save-buyer-requirements` edge function
- **Description (verbatim):** "The buyer's problem statement already arrived as free text in the buyer_requirement_submission payload (typed on the website's /buyer/discover form). Parse it (and any optional business-context fields already filled in) directly into Requirement records -- text, Priority (high/medium/low), source (buyer_input or ai_inferred), status captured -- and persist them immediately. This runs automatically, no buyer confirmation needed... Do not infer requirements the buyer has not stated or implied; tag anything genuinely inferred with source ai_inferred rather than buyer_input, and leave a field out entirely rather than guessing a number or detail the buyer never gave."
- **Request:** `companyName` (or existing `buyerId`), optional `industry`/`companySize`/`contactName`/`contactRole`, `requirements[]` (`text` required, `priority` enum high/medium/low, `source` enum buyer_input/ai_inferred).
- **Response:** `buyerId`, `companyName`, `savedRequirementIds[]`, `requirements[]` (each with `id`, `requirement_text`, `priority`, `source`, `status`).
- **Behavior note:** finds-or-creates the buyer (and its organization) by `companyName` if no `buyerId` is supplied — a returning buyer must pass their existing `buyerId` to avoid creating a duplicate.
- **No human interaction** — runs immediately on submit, no confirmation step.

---

### Step 2 — Recommend Vendors

**Agent: Solution Matching Agent**
> *Persona (global):* "You are the Solution Matching Agent. You compare buyer requirements against vendor capabilities and score fit strictly on evidence — you never stretch a vendor's Solution DNA to cover something it doesn't actually say. Every match you produce is one of: Strong Match, Partial Match (requires assumption), or Unmatched. You always produce the gap alongside the match: what the buyer has today, what they want, and what's missing."

**Step Instructions (verbatim):**
> "Create one deliverable: a ranked list of candidate vendors. Tool sequencing — strictly sequential: run 'Query All Published Vendor Solution DNA' first to retrieve every vendor's published Capabilities, then compare them against the buyer's Requirements, then run 'Save Vendor Recommendation Ranking' to persist each candidate vendor's fitScore and keyMatch summary — ranking cannot run before the query completes. Only recommend vendors whose published, verified or modelled Capabilities plausibly address the buyer's Requirements; never rank a vendor using unverified or unpublished capabilities. This ranking drives the /buyer/vendors grid (VendorMatchCard: fitScore, keyMatch, industries) — keep keyMatch to one short line, since it renders as a single summary chip per card."

#### Tool: Query All Published Vendor Solution DNA
- **Type:** Simulated Output → `query-published-vendor-solution-dna` (no request body)
- **Description (verbatim):** "Retrieve every vendor's published Capabilities (CapabilityCategory, verificationStatus, Evidence) across all vendors for comparison against the buyer's Requirements."
- **Response:** `vendorCount`, `vendors[]` (each: `vendorId`, `companyName`, `industry`, `industries[]`, `tagline`, `description`, `capabilities[]` — each capability has `id`, `name`, `description`, `category` enum [product/service/solution/feature/integration/industry/consulting/use_case/constraint], `verificationStatus` enum [verified/modelled/unverified/pending], `tags[]`, `evidence[]`). Only vendors with ≥1 capability whose status is `verified` or `modelled` are returned.

#### Tool: Save Vendor Recommendation Ranking
- **Type:** Simulated Output → `save-vendor-recommendation-ranking`
- **Description (verbatim):** "Run only after 'Query All Published Vendor Solution DNA' has returned every vendor's published Capabilities. Compare each vendor's Capabilities against the buyer's captured Requirements and compute a fitScore per vendor, plus a keyMatch — one short plain-language line naming the single strongest reason this vendor fits... Only score vendors using verified or modelled capabilities... Persist the ranked list (vendorId, fitScore, keyMatch, industries) sorted highest fitScore first; this feeds the /buyer/vendors grid directly and 'Request Buyer Vendor Selection' next."
- **Request:** `buyerId` (required), `rankings[]` (each: `vendorId` required, `fitScore`, `keyMatch`, `reason`, `confidence`, `evidence` free-form object).
- **Response:** `buyerId`, `savedCount`, `recommendations[]` (`id`, `vendor_id`, `fit_score`, `key_match`, `reason`, `confidence`) ordered by `fit_score` descending.
- **⚠ Destructive behavior:** this call **replaces every existing `vendor_recommendations` row for the buyer** (delete-then-insert). Never call it with a partial list you don't intend to be the complete new ranking.
- **⚠ Foreign keys:** `buyerId` is existence-checked (404 if missing); `rankings[].vendorId` is **not** pre-checked — an invented id causes a raw Postgres FK-violation 500. Frontend/agent must only pass real vendor ids returned by the query tool above.

---

### Step 3 — Confirm Vendor Selection

**Agent: Solution Matching Agent**

**Step Instructions (verbatim):**
> "Create one deliverable: the buyer's confirmed vendor selection. Tool sequencing — strictly sequential and blocking: run 'Request Buyer Vendor Selection' to present the ranked candidates (fitScore, keyMatch) and capture the buyer's choice, then run 'Save Selected Vendor Context' to persist the selected vendorId. **Do not proceed to Build Client Reality Profile or any later step until the buyer has explicitly confirmed a vendorId — this is a hard gate, not a default-to-top-ranked shortcut.** The confirmed vendor drives every subsequent screen (/buyer/vendors/[id], /buyer/solution, /buyer/chat) — a wrong or premature selection here corrupts everything downstream."

#### Tool: Request Buyer Vendor Selection
- **Type:** Ask Human for Approval (`human_approval`) — **buttons only**
- **Description (verbatim):** "Present the ranked candidates as a short, scannable comparison — vendor name, fitScore, and one plain-language keyMatch line each — not a data dump; lead with the top match and let the buyer expand for more before deciding. Ask plainly which vendor they'd like to explore, and always offer 'show me more options' or 'let me compare a couple first' rather than forcing an immediate single pick. Capture the buyer's selected vendorId once they confirm."
- **Frontend implication:** this is a genuine button-choice UI (a card per ranked vendor, "show me more" / "compare" as extra buttons) — do NOT build this as a free-text "type which vendor you want" box.

#### Tool: Save Selected Vendor Context
- **Type:** Simulated Output → `save-selected-vendor-context`
- **Description (verbatim):** "Run only after the buyer has explicitly confirmed a vendorId... Persist the confirmed vendorId as the buyer's active vendor context for the rest of this session. Every subsequent step (Build Client Reality Profile, Assess Vendor Fit and Business Gaps, Generate Personalized Solution Workspace, Explore What-If Scenarios, Grounded Exploration and Human Handoff) reads this saved vendorId — treat it as the single source of truth for 'which vendor' for the remainder of the workflow."
- **Request:** `buyerId`, `vendorId` (both required).
- **Response:** `selectionId`, `buyerId`, `vendorId`, `companyName`, `vendorCompanyName`, `isActive` (boolean). Deactivates any prior active selection for the buyer.

---

### Step 4 — Build Client Reality Profile

**Agent: Buyer Discovery Agent**

**Step Instructions (verbatim):**
> "Create one deliverable: the buyer's ClientRealityProfile, built from data that is already available -- do not attempt to interview the buyer field-by-field here, since 'Run Adaptive Discovery Questioning' can only return a choice from a fixed set of buttons, never typed free text, so treating it as a back-and-forth interview will hang this step waiting for answers that can never arrive. First, populate every field you can directly from the buyer's structured intake submission (the trigger payload) and from the Requirements already captured in 'Understand Buyer Requirement' -- most of currentTechnology, currentCostAnnual, users, and timelineMonths should already be there if the buyer filled in the website's optional business-context fields. For any field still missing, use 'Run Adaptive Discovery Questioning' at most once per field, and only to ask a closed yes/no or pick-one-of-a-few-named-options clarifying question -- never an open request like 'describe your...' or 'what is your...'. If the buyer picks a Skip option, or an option meaning 'answer this on the website instead', or 'Other', immediately record that field as unknown/unresolved (do not re-ask, do not wait for further text) and add it to the Capability Frontier for follow-up. Run 'Save Client Reality Profile' once with whatever combination of known and unknown fields you have -- an incomplete profile with several fields marked unknown is the correct, expected output, not a failure state."

#### Tool: Run Adaptive Discovery Questioning
- **Type:** Ask Human for Approval (`human_approval`) — **buttons only**
- **Description (verbatim):** "Use this tool ONLY to ask a short, genuinely closed-ended clarifying question where every acceptable answer can be listed as a button -- for example confirming which of 2-4 named options applies, or a yes/no check. This tool can never collect typed free text: it only returns which button the buyer clicked, so it must NEVER be used to ask an open-ended question... and then wait for a written answer -- there is no text box, and doing this hangs the workflow forever waiting for data that can't arrive this way. Open-ended fields (currentTechnology, currentCostAnnual, users, processes, painPoints, goals, constraints, timelineMonths) are collected on the buyer-facing website's /buyer/discover page instead (structured form fields, or an optional chat refinement with real text input) before or after this workflow runs -- if a field arrives filled in the payload, use it; if it's still blank, record it as unknown/unresolved and add it to the Capability Frontier for later follow-up rather than blocking here. Every question this tool does ask must offer a visible Skip option, and picking a button that itself means 'let me answer this elsewhere' (e.g. 'Fill this in on the website instead') must immediately be treated as unknown/unresolved -- never wait for a follow-up answer after that click."
- **Frontend implication:** any open-ended profile field (current tech, cost, pain points, goals, constraints, timeline) must be collectible as **real text input on `/buyer/discover` itself** (form fields or a chat box with actual typing) — this workflow tool structurally cannot collect that data mid-flow. Only closed yes/no or named-option gaps should route through this tool as buttons with a mandatory Skip option.

#### Tool: Save Client Reality Profile
- **Type:** Simulated Output → `save-client-reality-profile`
- **Description (verbatim):** "Run continuously alongside 'Run Adaptive Discovery Questioning' — after each answered turn (not just once at the end), persist the buyer's ClientRealityProfile fields as they're captured... This incremental save is what powers the live-building profile panel on /buyer/discover, so the buyer sees their answers reflected back immediately as they go, not only after the questioning finishes."
- **Request:** `buyerId` (required); optional `currentTechnology[]`, `currentCostAnnual`, `users`, `processes[]`, `painPoints[]`, `goals[]`, `constraints[]`, `timelineMonths`, `dataSources[]` — only supplied fields are changed (upsert semantics), omitted fields keep their prior saved value.
- **Response:** `profileId`, `buyerId`, plus the current value of every profile field.
- **Frontend implication:** `/buyer/discover` needs a **live-updating profile panel** that reflects saves as they stream in, not a single end-of-flow summary.

---

### Step 5 — Assess Vendor Fit and Business Gaps

**Agent: Solution Matching Agent**

**Step Instructions (verbatim):**
> "Create one deliverable: the fit-and-gap assessment for the selected vendor. **Tool sequencing — strictly sequential (the two tools below are listed on the canvas as 'Save' then 'Query', but must execute in the reverse of that order):** run 'Query Approved Vendor Solution DNA' first to retrieve the vendor's approved Capabilities, compare them against the buyer's Requirements and ClientRealityProfile, then run 'Save Fit and Gap Assessment' to record each SolutionMatch (with an honest matchStatus of strong_match, partial_match, unmatched, or requires_validation) and each GapItem (current/desired/gap/severity). Do not mark a match strong_match unless the published Evidence genuinely supports it; an unmatched or requires_validation result here is the direct input to the Grounded Exploration escalation path later, so under-claiming is safer than over-claiming. This assessment powers the /buyer/solution workspace's gap cards and match rows."

> ⚠ **Canvas-order vs. execution-order mismatch:** the Yoxa canvas lists "Save Fit and Gap Assessment" above "Query Approved Vendor Solution DNA," but the agent instructions explicitly say the Query must run first. Any integration tooling that infers call order from canvas position alone will get this step backwards.

#### Tool: Query Approved Vendor Solution DNA (runs first, despite canvas order)
- **Type:** Simulated Output → `query-approved-vendor-solution-dna`
- **Description (verbatim):** "Run this first, before 'Save Fit and Gap Assessment' — scope strictly to the single vendorId saved in 'Save Selected Vendor Context' (never query all vendors here, unlike the earlier recommendation step). Retrieve that vendor's published, approved Capabilities only... This full capability set is handed directly to 'Save Fit and Gap Assessment' for comparison."
- **Request:** `vendorId` (required).
- **Response:** `vendorId`, `companyName`, `capabilityCount`, `capabilities[]` (each with `evidence[]` including `sourceLabel`, `sourceType`, `sourceText`, `sourceLocation`, `evidenceType`).

#### Tool: Save Fit and Gap Assessment (runs second, despite canvas order)
- **Type:** Simulated Output → `save-fit-and-gap-assessment`
- **Description (verbatim):** "Run this second, even though it's listed first on the canvas — it depends on 'Query Approved Vendor Solution DNA' completing first. For each buyer Requirement, persist a SolutionMatch record: the matched Capability (or none), a matchStatus (strong_match/partial_match/unmatched/requires_validation), and for anything not a strong_match, a GapItem describing the shortfall in plain language... This persisted assessment is what /buyer/solution's gap cards and match rows render directly, so keep each GapItem description short enough to read as one card, not a paragraph."
- **Request:** `buyerId`, `vendorId` (required); `matches[]` (`buyerRequirementId`, `capabilityId`, `requirementText`, `capabilityName`, `matchStatus` enum, `confidence`, `reasoning`), `gaps[]` (`currentState`, `desiredState`, `gap`, `severity` enum high/medium/low).
- **Response:** `buyerId`, `vendorId`, `matchCount`, `gapCount`, full `matches[]` and `gaps[]` arrays with DB ids.
- **Behavior note:** replaces existing matches/gaps for this buyer+vendor pair that aren't yet attached to a solution model (delete-then-insert).

---

### Step 6 — Generate Personalized Solution Deck

**Agent: Solution Model Agent**
> *Persona (global):* "You are the Solution Model Agent. You turn an approved fit-and-gap assessment into a personalized, quantified solution narrative for one buyer. Every number is labelled Verified (from Vendor DNA or buyer data) or Modelled, with assumptions stated explicitly beside it. You never present a Modelled figure as Verified. Your output regenerates automatically when buyer inputs change; you never hard-code a one-time answer."

**Step Instructions (verbatim):**
> "Create one deliverable: a personalized SolutionModel, output as a PowerPoint (.pptx) pitch/solution deck. Tool sequencing -- strictly sequential: run 'Run Solution Scenarios' first to compute the RoiProjection (currentAnnualCost, projectedAnnualCost, savingsPercent, paybackMonths, threeYearSavings, year-by-year chart)... only once that projection exists, run 'Generate Solution Pitch Deck' to save the complete SolutionModel (executiveSummary, matches, gaps, roi) and render the buyer-facing .pptx deck..., setting its status to draft or active. Ground every ROI figure in the buyer's stated currentCostAnnual and the vendor's Capabilities; do not invent savings the fit-and-gap assessment does not support, and never present a Modelled figure as Verified. This SolutionModel object still backs /buyer/solution's Interactive Workspace tab for browsing on the website, but the artifact this step hands off to the buyer is the .pptx deck -- keep executiveSummary tight enough to read as one slide."

#### Tool: Run Solution Scenarios
- **Type:** Simulated Output → `save-solution-baseline-workspace`
- **Description (verbatim):** "Run first in this step, before 'Generate Live Solution Workspace' [internal name drift — canvas label is 'Generate Solution Pitch Deck', see §8.2]. Compute the selected vendor's baseline RoiProjection from the fit-and-gap assessment and the buyer's ClientRealityProfile: currentAnnualCost, projectedAnnualCost, savingsPercent, paybackMonths, and threeYearSavings. Base every figure on the buyer's actual captured data... and the vendor's verified/modelled Capabilities — never on generic industry averages. State any assumption used to bridge a data gap explicitly alongside the figure it affects... This baseline is what the buyer will adjust in the later What-If Scenarios step — keep it internally consistent (e.g. savingsPercent must actually reconcile with currentAnnualCost and projectedAnnualCost) since a later chat tool answers buyer questions against it."
- **Request:** `buyerId`, `vendorId` (required); optional `currentAnnualCost`, `projectedAnnualCost`, `savingsPercent`, `paybackMonths`, `threeYearSavings`, `chart` (free-form), `assumptions` (free-form, replaces stored assumptions if supplied).
- **Response:** `solutionModelId` (use this for step 7's Save Updated Scenario Projection), `buyerId`, `vendorId`, `roiProjectionId`, all ROI fields.
- **Behavior note:** finds-or-creates the buyer/vendor's **draft** `solution_models` row.

#### Tool: Generate Solution Pitch Deck
- **Type:** Output Tool, Output Type: **PowerPoint (.pptx)**
- **Description (verbatim, full — this is the canonical PPTX spec):**
  > "Run second, after 'Run Solution Scenarios' has produced the baseline RoiProjection. Assemble the complete SolutionModel... and render it as a polished, presentation-ready PowerPoint (.pptx) pitch/solution deck -- this file itself is the buyer-facing deliverable, not a webpage, and it must look like a professionally designed sales deck, not a text dump of the underlying data model.
  >
  > **CONTENT RULES:** Build a real pitch deck of **at least 10 slides**, one clear idea per slide, plain language a non-technical stakeholder can scan in seconds. Never print raw field or object names (RoiProjection, SolutionMatch, GapItem, ClientRealityProfile, executiveSummary, etc.) on a slide. Max 5 bullets per slide, max ~12 words per bullet. Every number must be sourced from the SolutionModel and labelled Verified or Modelled per the evidence-grounding rules -- never invent or silently round a figure.
  >
  > **DESIGN RULES:** One consistent, professional slide master — single font family, 2–3 brand colors max, consistent title placement, footer with slide number and buyer/vendor names. Title slide, section dividers, and closing slide must look visually distinct (full-bleed color or accent block, larger type). Use a real PowerPoint **table** (not a wall of text) for the fit-and-gap comparison and Investment Summary figures. Use a native PowerPoint **chart or shape-based bar/line visual** (never an image or a paragraph of numbers) for ROI/payback. Generous whitespace. Every content slide needs a short, benefit-oriented headline (never "Slide 6" or a field name).
  >
  > **Required slide topics, in order:**
  > 1. Title slide — buyer company + selected vendor + one-line value proposition
  > 2. Agenda
  > 3. The Buyer's Challenge — stated problem, current state, pain points
  > 4. Recommended Solution — vendor + one-line proposed approach
  > 5. Vendor Overview — why shortlisted, fit score /100, second-ranked alternative for context
  > 6. Fit & Capability Match — evidence-backed matches, as a table
  > 7. Gaps & Open Items — every GapItem, stated plainly
  > 8. Implementation Approach & Timeline
  > 9. ROI Projection — chart, explicitly labelled **Modelled**
  > 10. Investment Summary — cost/payback restated in a table
  > 11. Risks & Mitigations
  > 12. Recommended Next Steps
  > Optional Appendix slide only if there's supporting evidence worth citing.
  >
  > "Persist the underlying SolutionModel object as before (it still backs /buyer/solution), but the artifact this tool outputs and hands off is the .pptx deck, and it must contain at least 10 slides covering all required topics above... Status starts as 'draft' -- mark it 'active' only once the deck generates successfully."
- **Frontend implication:** `/buyer/solution` needs a **file-download / embedded-viewer surface** for the generated `.pptx`, separate from the still-live Interactive Workspace tab (gap cards / match rows).

---

### Step 7 — Explore What-If Scenarios

**Agent: Solution Model Agent**

**Step Instructions (verbatim):**
> "Explore what-if scenarios with the buyer during this step so every scenario tool actually runs each time this step is reached. If the buyer's message includes a hypothetical, scaling, or 'what if' question (about user count, timeline, or cost), treat that as the trigger and act immediately. If no such question has been raised yet by this point in the conversation, proactively pose one yourself instead of skipping this step — for example, ask how the projection would change if the buyer's user count grew from its current baseline — so the what-if exploration and its tools are never left unexercised. Capture the buyer's change (organic or self-proposed) and give live answers to any question the buyer asks while exploring. Tool sequencing: 'Adjust Scenario Assumptions' then 'Save Updated Scenario Projection' run together as a sequential pair every time the buyer changes an input (users, timelineMonths, currentCostAnnual) — capture first, then recompute and persist the chart, savingsPercent, paybackMonths, and threeYearSavings. 'Answer Scenario Questions (Live Chat)' runs independently and in parallel with that pair, on demand, any time the buyer types a question — it does not block or wait for a slider change, and a slider change does not block it either. Keep every adjusted figure traceable to the buyer's changed assumptions; do not silently alter the vendor's underlying Capabilities or the original fit-and-gap assessment. Chat answers must stay grounded in the vendor's Capabilities and the current RoiProjection; anything ungrounded is not answered here — see 'Answer Scenario Questions' for the handoff rule. **Feeds the /buyer/scenarios sliders, chart, and an embedded chat panel — this should replace that page's current fixed-formula client-side math with real agent output.**"

> ⚠ This last sentence is an explicit statement that `/buyer/scenarios` currently computes its numbers client-side with a fixed formula, and that this workflow is meant to **replace** that math end-to-end. Flag this for the frontend team as a required refactor, not an additive feature.

#### Tool: Adjust Scenario Assumptions
- **Type:** Ask Human for Approval (`human_approval`) — used here for slider capture
- **Description (verbatim):** "Present the /buyer/scenarios sliders (users, timelineMonths, currentCostAnnual) pre-filled with the current SolutionModel's values, not blank — the buyer is adjusting a known baseline, not starting from zero. As the buyer drags a slider, capture the new value; do not wait for a final 'submit' click if the frontend supports live updates, so the buyer sees the effect immediately. Every adjustment must stay tied to the underlying vendor Capabilities and fit-and-gap assessment — the buyer can change quantities and timelines, never invent a capability the vendor doesn't have. Hands the captured adjustment straight to 'Save Updated Scenario Projection' to recompute; this pair always runs together, in this order, on every slider change."
- **⚠ Type mismatch risk:** `human_approval` is a discrete button-click primitive; a continuous drag-slider UX described here does not map cleanly onto "wait for one button click." See §8.3 — this needs explicit UX/engineering design (e.g. treat each slider "step" or a debounced "confirm value" as one approval round-trip) before frontend build.

#### Tool: Save Updated Scenario Projection
- **Type:** Simulated Output → `save-updated-scenario-projection`
- **Description (verbatim):** "Run second, immediately after 'Adjust Scenario Assumptions' captures a new value — this pair is sequential and blocking on every slider change. Recompute the RoiProjection's chart, savingsPercent, paybackMonths, and threeYearSavings from the buyer's updated users/timelineMonths/currentCostAnnual, keeping the same underlying vendor Capabilities and fit-and-gap assessment... Persist the updated projection so it immediately reflects on the /buyer/scenarios chart and becomes the new current baseline that 'Answer Scenario Questions (Live Chat)' grounds its answers in... **And just like the tool 'Generate Solution Pitch Deck' need to generate and give output of the updated pitch deck with the new and updated changes made by the user, and the updated pitch deck will be displayed to user after updated scenarios and data.**"
- **Request:** `solutionModelId` (required), optional `name` (defaults "Adjusted Scenario"), `description`, `inputChanges` (free-form), `resultingRoi` (`currentAnnualCost`, `projectedAnnualCost`, `savingsPercent`, `paybackMonths`, `threeYearSavings`, `chart`), `resultingRecommendations` (free-form).
- **Response:** `scenarioId`, `solutionModelId`, `name`, `inputChanges`, `resultingRoi`, `resultingRecommendations`, `currentRoiProjection` (the model's live projection after any numeric `resultingRoi` fields were applied, or `null` if none supplied).
- **⚠ Gap:** the description explicitly says a **regenerated pitch deck** should be produced after every scenario change, "just like" step 6's `Generate Solution Pitch Deck." There is **no second Output Tool call wired into this step** to actually do that regeneration — see §8.4.

#### Tool: Answer Scenario Questions (Live Chat)
- **Type:** Ask Human for Approval (`human_approval`) — **buttons only**
- **Description (verbatim):** "This is the live chat panel embedded in the What-If Scenarios view — wait for the buyer to type a question as they adjust sliders; this runs independently and in parallel with 'Adjust Scenario Assumptions' / 'Save Updated Scenario Projection', on demand, whenever the buyer sends a message. Once a question is captured, ground the answer strictly in the vendor's published Solution DNA (Capabilities + Evidence) and the buyer's current SolutionModel/RoiProjection... Tag the answer verified..., modelled..., or out-of-scope. Never guess or answer from general knowledge. Any question that falls outside the grounded knowledge base... is NOT answered here: hand it to 'Query Workspace Evidence' in Grounded Exploration and Human Handoff next... Keep replies short, conversational, and in plain language... Depends on 'Save Updated Scenario Projection' being current before answering questions about projected figures."
- **🛑 Confirmed defect:** the description says "wait for the buyer to **type** a question," but the Select Action is `human_approval`, which can only register a button click — it structurally cannot receive typed text. This is one of three occurrences of the same platform-mismatch bug in this workflow (§8.1) and, per prior test runs, causes real hibernation/hangs. **Must be redesigned before integration** — either as a curated button-list of common questions with a "something else" fallback that routes to the true free-text buyer chat surface, or rebuilt on a tool type that can accept text.

---

### Step 8 — Grounded Exploration and Human Handoff

**Agent: Grounding and Escalation Agent**
> *Persona (global):* "You are the Grounding and Escalation Agent, the trust layer for everything the buyer sees. You check evidence first and respond in exactly one of three modes: Verified (answer with source), Modelled (answer with assumptions), or Unverified (escalate via a Capability Frontier item). Pricing exceptions, discounts, contract terms, SLAs, and negotiation are always human-only, regardless of evidence. Every turn leaves an audit record: claim, source, confidence, and escalation status."

**Step Instructions (verbatim, full):**
> "Create one deliverable: a grounded response to the buyer's exploration of their solution workspace, tagged with a responseStatus (verified, modelled, or escalated) — the platform's three-outcome rule: Answer (verified), Simulate (modelled, with stated assumptions), or Escalate (never guess). This step is also the escalation destination for out-of-scope questions the buyer asked earlier in 'Answer Scenario Questions (Live Chat)' during What-If Scenarios — treat those exactly like an ungrounded question surfaced here, entering at step (3) below.
>
> **Tool sequencing — branching, not linear:**
> 1. Always run 'Query Workspace Evidence' first, for every buyer question — invoke it immediately and unconditionally as your very first action in this step. Never decide in advance whether a buyer question exists, and never hibernate/wait before calling it: the tool call itself is what surfaces the buyer's question (live from /buyer/chat, or from this step's configured test response when running in Test Mode) and it is the tool, not you, that waits if no question is available yet.
> 2. If the question is fully grounded, answer directly (verified) or with explicit assumptions (modelled) and skip to step (5).
> 3. If it cannot be grounded, run 'Create Capability Frontier Item' then 'Send Governed Vendor Notification' as a sequential pair — notification only fires once the item exists. This is the escalated path.
> 4. Only if the buyer then asks for a live discussion, run 'Approve Human Handoff' followed by 'Schedule Vendor Discussion' (sequential — scheduling requires the buyer's approval first); this sub-branch is optional and independent of whether step (3) ran.
> 5. Always run 'Save Interaction Resolution' last, regardless of which branch was taken.
>
> **Vendor-side follow-through:** once the vendor answers via 'Resolve Capability Frontier Item' or confirms a meeting via 'Confirm Vendor Discussion Meeting', update the originating CapabilityFrontierItem/MeetingRequest and surface the resolution back to the buyer's chat and dashboard. Those two vendor tools are independent, on-demand actions... never assume one implies the other has happened.
>
> Never present an unverified or modelled claim as verified. **Frontend:** powers /buyer/chat (responseStatus-tagged messages, suggested-question buttons), /buyer/handoff (scheduling), and /vendor/capability-frontier + /vendor/meetings for the vendor side — **the vendor pages currently have no working answer/confirm controls wired up in the frontend and need one before this step can close the loop end-to-end.**"

> ⚠ This step is the escalation *destination* for step 7's live-chat tool as well as the primary entry point for `/buyer/chat` — both paths converge here.
> ⚠ The step instructions explicitly flag that `/vendor/capability-frontier` and `/vendor/meetings` **do not yet have working answer/confirm controls** in the frontend — this is a stated blocker for closing the loop end-to-end, called out by name in the source instructions, not inferred.

#### Tool: Query Workspace Evidence
- **Type:** Ask Human for Approval (`human_approval`) — **buttons only**
- **Description (verbatim):** "This is the buyer's chat input point on /buyer/chat — present the running conversation and wait for the buyer to type their next question (or receive it as a handed-off out-of-scope question from 'Answer Scenario Questions (Live Chat)' during What-If Scenarios). Once a question is captured, search everything grounded for this buyer's session: the SolutionModel's SolutionMatch/GapItem records, the vendor's published Capabilities and Evidence, and the current RoiProjection... Hand the question plus whatever evidence was found... back to the agent, which decides the next branch: answer directly if grounded, or escalate via 'Create Capability Frontier Item' if not. Never fabricate a partial match to avoid escalating — an honest 'nothing found' is correct, not a failure."
- **🛑 Confirmed defect — the main buyer-chat entry point itself:** this is `/buyer/chat`'s primary input tool, and it is described as "wait for the buyer to type their next question," but its Select Action is `human_approval` (buttons only). This is the most consequential of the three free-text/button mismatches in this workflow (§8.1), because it sits on the **main chat surface**, not a secondary panel. **This must be resolved before integration** — the real buyer-chat text box needs to reach the agent through a mechanism this tool type can actually support (see §8.1 for options).

#### Tool: Create Capability Frontier Item
- **Type:** Simulated Output → `create-capability-frontier-item`
- **Description (verbatim):** "Run when 'Query Workspace Evidence' finds nothing grounded to answer the buyer's question... Create a CapabilityFrontierItem with FrontierStatus 'open': the buyer's exact question, the related GapItem if one exists, and a plain-language reasonUnresolved... This record is what the vendor will later see and answer on /vendor/capability-frontier — write reasonUnresolved as something the vendor can act on, not an internal error message. Always followed immediately by 'Send Governed Vendor Notification' — do not let a frontier item exist without notifying the vendor."
- **Request:** `buyerId`, `vendorId`, `question` (all required); optional `solutionModelId`, `requirement`, `context`, `evidenceChecked[]`, `reasonUnresolved`, `recommendedExpert`.
- **Response:** `frontierItemId`, `buyerId`, `vendorId`, `question`, `status` (starts `open`; enum: open/vendor_review/vendor_answered/resolved/closed), `reasonUnresolved`.

#### Tool: Send Governed Vendor Notification
- **Type:** Platform Email
- **Description (verbatim):** "Run immediately after 'Create Capability Frontier Item' — never let a frontier item sit un-notified. Send a short, plain-language email to the vendor: state that a prospective buyer asked a question their published Solution DNA doesn't yet cover, include the question itself and the reasonUnresolved, and link directly to /vendor/capability-frontier to respond. Keep it factual and low-pressure — this is a business opportunity signal, not a complaint. Include only what the vendor needs to answer... never include the buyer's identity, contact details, or other Requirements/ClientRealityProfile data beyond what's directly relevant to this one question. This action moves the item's FrontierStatus from open to vendor_review... ('Resolve Capability Frontier Item', not modeled in this workflow, handles that on the vendor side)."
- **Configuration in Yoxa:** Recipient Mode is currently **"Send to fixed recipient"** with a hardcoded test address (see §8.5) — production needs "Let Agent Decide" with the real vendor's registered contact email, or an equivalent dynamic lookup.
- **Privacy note explicitly stated in the tool description:** never include buyer identity/contact details in this email.

#### Tool: Approve Human Handoff
- **Type:** Ask Human for Approval (`human_approval`) — buttons, and this one is used correctly (closed-ended by design)
- **Description (verbatim):** "When a question is escalated, tell the buyer plainly what happened and why in one or two short sentences (e.g. 'That's not something I can verify from CloudNova's published information — want me to get a specialist to confirm it?') — never a raw system message. Ask, don't assume: only offer a live discussion if the buyer wants one; if they'd rather keep exploring on their own, do not schedule anything. If they say yes, confirm which unresolved question(s) the meeting should cover before handing off to scheduling."

#### Tool: Schedule Vendor Discussion
- **Type:** Simulated Output → `schedule-vendor-discussion`
- **Description (verbatim):** "Once the buyer approves handoff, create a MeetingRequest (buyerName, vendorName, expert, proposedDate, status 'requested') tied to the unresolved CapabilityFrontierItem(s), and assemble the structured context package the vendor will see when they open it on /vendor/meetings: the buyer's original problem statement, the topics explored so far, the full list of unresolved questions (not just one 'topUnresolved' string), which evidence sources were checked and found insufficient, and the recommended expert role. Build one context package per MeetingRequest — do not reuse a single shared package across different buyers' meetings. **The details of this scheduled meeting should be sent to the vendor via email as well to notify them of the details. The email address can be taken from the 'Send Governed Vendor Notification' tool.**"
- **Request:** `buyerId`, `vendorId` (required); optional `frontierItemIds[]`, `proposedDate`, `expert`, `contextPackage` (free-form, defaults to `{ frontierItemIds }`).
- **Response:** `meetingRequestId`, `buyerId`, `vendorId`, `status` (enum requested/scheduled/completed/cancelled), `proposedDate`, `expert`, `unresolvedCount`.
- **⚠ Gap:** the description calls for a **second vendor email** notifying them of the scheduled meeting, reusing the address configured on `Send Governed Vendor Notification` — but there is no second Platform Email tool wired into this step to send it (§8.4).

#### Tool: Save Interaction Resolution
- **Type:** Simulated Output → `save-interaction-resolution`
- **Description (verbatim):** "Always run last in this step, regardless of which branch was taken above — a direct grounded answer, an escalation, or an escalation that also led to a scheduled meeting. Record one ConversationMessage per buyer question: the question text, the answer given (or 'escalated — awaiting vendor response' if unresolved), and a responseStatus of verified, modelled, or escalated — never leave responseStatus blank or default it to verified. This is what /buyer/chat renders per message (with the responseStatus visibly tagged) and what /buyer/handoff reads to show scheduling state. If this question was originally asked in the What-If Scenarios live chat and escalated here, link this resolution back to that originating message so the buyer sees the update appear in the same conversation thread they asked it in, not just in a separate chat."
- **Request:** `buyerId`, `questionText`, `answerText` (all required); optional `responseStatus` (enum verified/modelled/escalated, defaults `modelled`), `conversationId` (omit to reuse buyer's most recent conversation or start a new one), `vendorId`, `solutionModelId`, `assumptions[]`, `evidence` (free-form).
- **Response:** `conversationId`, `messageId`, `responseStatus`, `content`.

---

## 6. Full node-type inventory (quick reference)

| # | Step | Agent | Tool | Type |
|---|---|---|---|---|
| — | Trigger | — | `buyer_requirement_submission` | Trigger (text/file input) |
| 1 | Understand Buyer Requirement | Buyer Discovery Agent | Capture Initial Requirement Summary | Simulated Output |
| 2 | Recommend Vendors | Solution Matching Agent | Query All Published Vendor Solution DNA | Simulated Output |
| 2 | Recommend Vendors | Solution Matching Agent | Save Vendor Recommendation Ranking | Simulated Output |
| 3 | Confirm Vendor Selection | Solution Matching Agent | Request Buyer Vendor Selection | Ask Human for Approval |
| 3 | Confirm Vendor Selection | Solution Matching Agent | Save Selected Vendor Context | Simulated Output |
| 4 | Build Client Reality Profile | Buyer Discovery Agent | Run Adaptive Discovery Questioning | Ask Human for Approval |
| 4 | Build Client Reality Profile | Buyer Discovery Agent | Save Client Reality Profile | Simulated Output |
| 5 | Assess Vendor Fit and Business Gaps | Solution Matching Agent | Query Approved Vendor Solution DNA | Simulated Output |
| 5 | Assess Vendor Fit and Business Gaps | Solution Matching Agent | Save Fit and Gap Assessment | Simulated Output |
| 6 | Generate Personalized Solution Deck | Solution Model Agent | Run Solution Scenarios | Simulated Output |
| 6 | Generate Personalized Solution Deck | Solution Model Agent | Generate Solution Pitch Deck | Output Tool (.pptx) |
| 7 | Explore What-If Scenarios | Solution Model Agent | Adjust Scenario Assumptions | Ask Human for Approval |
| 7 | Explore What-If Scenarios | Solution Model Agent | Save Updated Scenario Projection | Simulated Output |
| 7 | Explore What-If Scenarios | Solution Model Agent | Answer Scenario Questions (Live Chat) | Ask Human for Approval ⚠ |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Query Workspace Evidence | Ask Human for Approval ⚠ |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Create Capability Frontier Item | Simulated Output |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Send Governed Vendor Notification | Platform Email |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Approve Human Handoff | Ask Human for Approval |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Schedule Vendor Discussion | Simulated Output |
| 8 | Grounded Exploration and Human Handoff | Grounding and Escalation Agent | Save Interaction Resolution | Simulated Output |

⚠ = flagged defect, see §7 immediately below.

---

## 7. Cross-cutting integration risks & known gaps

These are not speculative — every item below is either an explicit statement inside a tool's own instructions text, or a directly observed behavior from a real Test Mode run of this workflow.

### 7.1 The free-text-vs-buttons defect (appears 3 times)
`Ask Human for Approval` in Yoxa can only present fixed buttons and register one click — it has no text box and cannot receive typed input. Three tools in this workflow are described in their own instructions as waiting for the user to *type* something, despite being wired as `human_approval`:

1. **Query Workspace Evidence** (step 8) — described as `/buyer/chat`'s main input point, "wait for the buyer to type their next question." **Highest severity** — this is the primary chat surface.
2. **Answer Scenario Questions (Live Chat)** (step 7) — described as the What-If Scenarios embedded chat panel, "wait for the buyer to type a question."
3. **Adjust Scenario Assumptions** (step 7) — a continuous slider UX mapped onto a discrete-click primitive (related but distinct issue, see §7.3).

Confirmed in a live Test Mode run: this pattern produces a stuck/hibernating workflow, and in one observed run, an entire branch of downstream tools (`Create Capability Frontier Item`, `Schedule Vendor Discussion`, `Save Interaction Resolution`) were skipped because the upstream "capture the question" step never received real question content — it only ever receives whichever button the test operator happened to click.

**Recommended fix pattern (used successfully elsewhere in a prior fix to this workflow):** keep the tool as `human_approval`, but curate a fixed, well-chosen list of common questions as buttons plus an explicit "something else" option, and route true open-ended text capture to wherever the platform's real chat input actually lives (i.e., outside this tool, at the page/session level, with the resulting text handed to the agent as the trigger — matching how the step instructions describe the *tool call itself* as what "surfaces" the question, not the button response). This needs a decision from Yoxa/engineering on how free text actually reaches an agent step in production, since the three affected surfaces are all supposed to be genuine typed-chat panels on the buyer-facing site.

### 7.2 Internal tool-name drift
`Run Solution Scenarios`'s own description refers to the next tool as **"Generate Live Solution Workspace,"** but the canvas/checklist name for that tool is **"Generate Solution Pitch Deck."** Functionally the same tool, but any tooling or documentation that greps for exact tool names by string match should account for this alias.

### 7.3 Slider input mapped onto a button-only primitive
`Adjust Scenario Assumptions` is `human_approval` but is described as capturing continuous slider drags "live" without waiting for a submit click. This needs an explicit UX decision before frontend build — e.g., treating each debounced "settle" of the slider as one approval round-trip, or reconsidering the tool type.

### 7.4 Two described actions with no wired tool call
Two instructions explicitly call for an action that has no corresponding tool node in this step:
- **Save Updated Scenario Projection** (step 7) says the pitch deck should regenerate ("just like the tool 'Generate Solution Pitch Deck'") after every scenario adjustment, but step 7 has no Output Tool call to actually do this.
- **Schedule Vendor Discussion** (step 8) says a second vendor email should be sent for the scheduled meeting, reusing the address from `Send Governed Vendor Notification`, but no second Platform Email tool exists in this step.

Both need either a new tool node added to the workflow, or an explicit decision that this is out of scope for v1 integration.

### 7.5 Vendor notification email is hardcoded to a test recipient
`Send Governed Vendor Notification`'s Recipient Mode is currently set to **"Send to fixed recipient"** with a specific test email address baked in ("Local test runs always deliver to this fixed recipient" per Yoxa's own UI copy). Before production, this must switch to **"Let Agent Decide"** (or equivalent) so the email actually reaches the real vendor's registered contact, not a fixed test inbox.

### 7.6 `/buyer/scenarios` currently computes ROI client-side and needs replacing
Step 7's own instructions state this page "should replace that page's current fixed-formula client-side math with real agent output" — meaning the existing frontend implementation (if any) computes scenario numbers locally rather than calling this workflow. Treat this as a required refactor of existing behavior, not a net-new feature.

### 7.7 Vendor-side pages have no working controls yet (stated blocker)
Step 8's instructions state directly: **"the vendor pages currently have no working answer/confirm controls wired up in the frontend and need one before this step can close the loop end-to-end."** This affects `/vendor/capability-frontier` (answering a `CapabilityFrontierItem`) and `/vendor/meetings` (confirming a `MeetingRequest`). Both vendor-side tools that close this loop — **Resolve Capability Frontier Item** and **Confirm Vendor Discussion Meeting** — are explicitly called out as "not modeled in this workflow" (they belong to the vendor-side workflow/frontend, already integrated separately per the user's context, but their *controls* are the stated gap).

### 7.8 Foreign-key-sensitive fields with no existence pre-check
Several Simulated Output tools accept ids (`vendorId` inside `Save Vendor Recommendation Ranking`'s `rankings[]`, various ids elsewhere) that are **not** existence-checked before insert — an invalid id causes a raw Postgres FK-violation 500 rather than a clean 404. Frontend/agent code must only ever pass ids that came from a prior query response in this same session, never a hand-typed or cached-stale id.

### 7.9 Destructive replace-semantics to design around
`Save Vendor Recommendation Ranking` (step 2) and `Save Fit and Gap Assessment` (step 5) both **replace the buyer's entire prior list** on every call (delete-then-insert), not an incremental upsert. Any retry logic or partial-update UI must always resend the complete current list, never a diff.

---

## 8. Supabase schema reference (tables touched by this workflow)

All in the `public` schema, project `rrtmvsfpzurafzycjboz`:

| Table | Touched by |
|---|---|
| `organizations`, `organization_members` | Buyer org auto-created by `save-buyer-requirements` |
| `buyers` | `save-buyer-requirements` (create/find), existence-checked by most later tools |
| `buyer_requirements` | `save-buyer-requirements` |
| `vendors`, `solution_capabilities`, `solution_evidence` | Read-only from the buyer side (`query-published-vendor-solution-dna`, `query-approved-vendor-solution-dna`) — owned by the vendor-side workflow |
| `vendor_recommendations` | `save-vendor-recommendation-ranking` (full replace per buyer) |
| `buyer_vendor_selections` | `save-selected-vendor-context` (deactivates prior active row) |
| `client_reality_profiles` | `save-client-reality-profile` (upsert by buyer) |
| `solution_matches`, `gap_items` | `save-fit-and-gap-assessment` (full replace per buyer+vendor, pre-solution-model) |
| `solution_models` | `save-solution-baseline-workspace` (find-or-create draft), `generate-solution-pitch-deck` (persist complete model, draft→active) |
| `roi_projections` | `save-solution-baseline-workspace`, `save-updated-scenario-projection` (patches live projection) |
| `solution_scenarios` | `save-updated-scenario-projection` |
| `capability_frontier` | `create-capability-frontier-item`, `send-governed-vendor-notification` (status transition), vendor-side `Resolve Capability Frontier Item` (not in this workflow) |
| `meeting_requests` | `schedule-vendor-discussion`, vendor-side `Confirm Vendor Discussion Meeting` (not in this workflow) |
| `conversations`, `messages` | `save-interaction-resolution` |
| `audit_events` | Referenced conceptually by the Grounding and Escalation Agent persona ("every turn leaves an audit record") — verify whether this is actually written by any tool above, or still needs a dedicated write |
| `vendor_dna_approval_requests` | Vendor-side only, not touched by this workflow |

---

## 9. Vendor-side counterpart tools referenced but not modeled here

These are named explicitly inside the buyer workflow's own instructions as the other half of a hand-off, and live in the already-integrated vendor-side workflow:

- **Resolve Capability Frontier Item** — vendor answers a `CapabilityFrontierItem`, moving it out of `vendor_review`.
- **Confirm Vendor Discussion Meeting** — vendor confirms a `MeetingRequest`.

Per §7.7, the frontend controls that trigger these on `/vendor/capability-frontier` and `/vendor/meetings` are explicitly flagged as not yet built.

---

## 10. Summary checklist for frontend integration

- [ ] Build `/buyer/discover` with both a free-text problem statement and structured optional business-context fields (current systems, cost, users, timeline, compliance), since these are the *only* legitimate place open-ended data can enter the workflow (§5 Step 4, §7.1).
- [ ] Build `/buyer/requirements` (RequirementCard list), `/buyer/vendors` (VendorMatchCard grid), `/buyer/vendors/[id]`.
- [ ] Build the vendor-selection UI on `/buyer/vendors` as button/card choices, not free text (Step 3).
- [ ] Build a live-updating ClientRealityProfile panel on `/buyer/discover` (Step 4).
- [ ] Build `/buyer/solution` with both the Interactive Workspace (gap/match cards) and a `.pptx` download/viewer surface (Step 6).
- [ ] Rebuild `/buyer/scenarios` to call this workflow's live agent output instead of client-side fixed-formula math (§7.6), with slider UX resolved against `human_approval`'s click-only semantics (§7.3).
- [ ] Resolve the three free-text-vs-buttons mismatches before relying on `/buyer/chat` or the What-If Scenarios chat panel (§7.1) — this is the single highest-priority defect in this document.
- [ ] Decide how/whether to add the two described-but-unwired actions: deck regeneration after scenario changes, and the second vendor meeting-confirmation email (§7.4).
- [ ] Switch `Send Governed Vendor Notification`'s recipient from the fixed test address to a dynamic vendor lookup (§7.5).
- [ ] Build the missing `/vendor/capability-frontier` answer control and `/vendor/meetings` confirm control (§7.7) — stated blocker for closing the loop end-to-end.
- [ ] Audit whether `audit_events` is actually being written anywhere, given the agent persona's claim that "every turn leaves an audit record" (§8).
