# Product Requirements Document
## Deck-less Pitch — Vendor-Side Workflow
### Integration PRD — Vendor Onboarding to Buyer Fit Assessment
*Node-by-node specification for frontend action & trigger integration*

| Field | Value |
|---|---|
| Source Platform | Yoxa.ai — Agentic Workflow Builder |
| Use Case | Deck-less Pitch — Vendor-Side-Workflow |
| Workflow Name | Vendor Onboarding to Buyer Fit Assessment |
| Builder Version Documented | v21 (latest saved) — Aug 18, 2026, 6:18 PM IST |
| Version Changelog (v21) | Added 'Query Draft Vendor Capabilities' tool node, wired to review agent; updated step instructions |
| Vendor-Side Status | Tested and ready for integration (per stakeholder sign-off) |
| Document Prepared For | Bhakti Dangri — frontend action/trigger integration planning |
| Document Date | August 18, 2026 |

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Use Case Overview](#2-use-case-overview)
3. [Workflow Architecture Overview](#3-workflow-architecture-overview)
   - 3.1 [Node inventory](#31-node-inventory)
   - 3.2 [Execution / sequencing model](#32-execution--sequencing-model)
   - 3.3 [End-to-end flow](#33-end-to-end-flow)
4. [Human-in-the-Loop Summary](#4-human-in-the-loop-summary)
5. [Node-by-Node Specification](#5-node-by-node-specification)
   - 5.1 [Trigger — vendor_source_submission](#51-trigger--vendor_source_submission)
   - 5.2 [Milestone 1 — Ingest Vendor Sources and Build DNA Draft](#52-milestone-1--ingest-vendor-sources-and-build-dna-draft)
   - 5.3 [Milestone 2 — Review and Publish Vendor Solution DNA](#53-milestone-2--review-and-publish-vendor-solution-dna)
6. [Cross-Workflow Boundary — Buyer Solution Platform](#6-cross-workflow-boundary--buyer-solution-platform)
7. [Data Transfer & Integration Surface Summary](#7-data-transfer--integration-surface-summary)
8. [Frontend Action & Trigger Mapping](#8-frontend-action--trigger-mapping)
9. [Integration Readiness Checklist](#9-integration-readiness-checklist)
10. [Appendix A: Test Fixtures Present in Builder](#appendix-a-test-fixtures-present-in-builder)
11. [Appendix B: Version Reference](#appendix-b-version-reference)

---

## 1. Purpose & Scope

This document is the integration PRD for the Vendor-Side Workflow of the "Deck-less Pitch" product, built and validated in the Yoxa.ai agentic workflow builder (use case: "Deck-less Pitch — Vendor-Side-Workflow", workflow: "Vendor Onboarding to Buyer Fit Assessment", latest builder version v21). The vendor side has been tested inside the builder and is now ready to be wired into the product frontend.

The purpose of this PRD is to capture, node by node, every trigger, step, agent, and tool in the current (v21) build — its title, description, instructions, input, output, human-interaction points, and data-transfer behavior — so that engineering can design frontend actions and triggers that match this workflow exactly, and so that backend integration work (API wiring for simulated tools) can be scoped precisely.

**In scope**

- The full Vendor-Side Workflow as configured in Yoxa.ai v21: 1 trigger, 2 sequential milestones (steps), 2 agent instances, 6 tools.
- Every node's configuration: name, description/instructions, action type, inputs, outputs, human interaction, and data transfer.
- The single human-in-the-loop checkpoint (vendor DNA approval) and its exact interaction contract.
- The handoff boundary to the separate Buyer Solution Platform workflow (referenced but not itself in scope here).
- A frontend action/trigger mapping recommendation, and an integration-readiness checklist.

**Out of scope**

- The Buyer Solution Platform workflow's own internal nodes (Buyer Discovery, Solution Matching, Solution Model, Grounding & Escalation) — documented only as adjacent context in Appendix A, since they live in a separate workflow triggered later by buyer activity.
- Actual backend implementation of the three currently-simulated tools — flagged here as required work, not designed in this document.

---

## 2. Use Case Overview

Metadata as configured in the Yoxa.ai "Use Case Details" panel for this workflow:

| Field | Value |
|---|---|
| Title | Deck-less Pitch — Vendor-Side-Workflow |
| Description | Enable vendors to register verified capabilities once and enable buyers to discover, evaluate, and explore how those capabilities apply to their own business. The system uses adaptive discovery, evidence-grounded matching, live scenario modelling, and confidence-gated human handoff instead of static pitch decks and repetitive preliminary meetings. |
| Domain | Sales and Presales |
| Sub-Domain | Vendor solution discovery and personalized presales |
| Function | Sales and Presales |
| Workflow | Vendor Onboarding to Buyer Fit Assessment — 2 Steps · 2 Agents |

---

## 3. Workflow Architecture Overview

The Vendor-Side workflow is a single linear pipeline of two sequential milestones (steps), each owned by one instance of the same agent ("Vendor Intelligence Agent"), each with its own set of tools and its own step-specific instructions. Tools inside a step may run in parallel or strictly in sequence depending on their data dependencies — this is called out explicitly per node in Section 5.

### 3.1 Node inventory

| Node Type | Node Name | Belongs To | Action / Integration Type |
|---|---|---|---|
| Trigger | **vendor_source_submission** | Workflow entry point | Text / File input |
| Step (Milestone 1) | **Ingest Vendor Sources and Build DNA Draft** | — | Agent step |
| Agent | Vendor Intelligence Agent (instance 1) | Milestone 1 | AI Agent |
| Tool | Crawl Known Vendor Website | Milestone 1 / Agent 1 | web_crawler (live) |
| Tool | Ingest Vendor Documents and Direct Inputs | Milestone 1 / Agent 1 | workflow_input (internal) |
| Tool | Save Vendor Solution DNA Draft | Milestone 1 / Agent 1 | simulated_tool ⚠ |
| Step (Milestone 2) | **Review and Publish Vendor Solution DNA** | — | Agent step |
| Agent | Vendor Intelligence Agent (instance 2) | Milestone 2 | AI Agent |
| Tool | Query Draft Vendor Capabilities | Milestone 2 / Agent 2 | simulated_tool ⚠ |
| Tool | Request Vendor DNA Approval | Milestone 2 / Agent 2 | human_approval ⭐ |
| Tool | Publish Approved Vendor Solution DNA | Milestone 2 / Agent 2 | simulated_tool ⚠ |

> **INTEGRATION FLAG** — 3 of the 6 tools in this workflow ('Save Vendor Solution DNA Draft', 'Query Draft Vendor Capabilities', 'Publish Approved Vendor Solution DNA') are currently configured as Simulated Output — they are mocked inside the builder and are not yet wired to a real persistence/backend API. All three touch the vendor-capability data store and together define the primary backend integration surface for this project. See Section 7 and Section 9.

### 3.2 Execution / sequencing model

- Milestone 1 and Milestone 2 run strictly in sequence — Milestone 2 cannot start until Milestone 1's agent has completed its deliverable.
- Within Milestone 1, the builder's own guidance states: "Agents assigned to this step execute in parallel and can communicate internally to collaborate." 'Crawl Known Vendor Website' and 'Ingest Vendor Documents and Direct Inputs' are explicitly independent, non-blocking, parallel intake channels; 'Save Vendor Solution DNA Draft' is a join/barrier step that must wait for both to finish before it runs.
- Within Milestone 2, the three tools run strictly in sequence: 'Query Draft Vendor Capabilities' must run first (it is the only source of capability data visible in this milestone); 'Request Vendor DNA Approval' is then called once per capability, looping until every capability has a decision or the vendor stops; 'Publish Approved Vendor Solution DNA' runs last, and may be called as soon as at least one capability has a decision (it does not have to wait for every capability to be decided).
- The workflow terminates after 'Publish Approved Vendor Solution DNA'. There is no further vendor-side node — downstream buyer-facing behavior (capability-frontier questions, meeting scheduling) is explicitly out of scope, living in the separate Buyer Solution Platform workflow.

### 3.3 End-to-end flow

```
vendor_source_submission (trigger)
   ↓
Milestone 1: Ingest Vendor Sources and Build DNA Draft
   [Crawl Known Vendor Website  ∥  Ingest Vendor Documents and Direct Inputs]
   ↓
   Save Vendor Solution DNA Draft
   ↓
Milestone 2: Review and Publish Vendor Solution DNA
   Query Draft Vendor Capabilities
   ↓
   Request Vendor DNA Approval  (looped, per capability, human-in-the-loop)
   ↓
   Publish Approved Vendor Solution DNA
   ↓
Hand-off to Buyer Solution Platform
   (vendor now visible/matchable at /buyer/vendors)
```

---

## 4. Human-in-the-Loop Summary

This workflow has exactly one human-interaction checkpoint. It is the single most important node for frontend design, since it is the only point where a real person must act before the workflow can proceed.

| Field | Detail |
|---|---|
| Node | Request Vendor DNA Approval (Milestone 2, Tool 2 of 3) |
| Who | The vendor who submitted their sources at the trigger step |
| Cardinality | Called once per pending Capability — looped until every capability has a decision or the vendor stops mid-way (partial completion is valid) |
| What is shown | Exactly one Capability per call, as a scannable card: capability name, capabilityId, source Evidence snippet(s), current verificationStatus (verified / modelled / unverified / pending), and a running "N capabilities remaining" counter. If two sources conflict on this capability, both snippets are surfaced for the vendor to pick or reconcile. |
| Choices offered | • **Approve as-is** — decision: approved; publishes the extracted claim unchanged<br>• **Revise then approve** — decision: approved; vendor is asked what to change, then the edited text/category is approved<br>• **Reject** — decision: rejected; capability stays saved but unpublished<br>• **Leave pending** — decision: escalated; no change, can be revisited later |
| Decision payload | `{ capabilityId, verificationStatus, description (only if vendor-edited), decidedAt }` — this exact shape is what 'Publish Approved Vendor Solution DNA' expects in its decisions array |
| Frontend implication | Build a single-capability approval card/modal component with 4 explicit action buttons and a remaining-count indicator; this component is called in a loop, so it should support being re-invoked immediately with the next capability without a full page reload. |

---

## 5. Node-by-Node Specification

This section documents every node in the v21 build in canvas order. Each node's fields are taken verbatim from its configuration panel in the builder.

### 5.1 Trigger — vendor_source_submission

**`TRIGGER · vendor_source_submission`**

`ENTRY POINT – Workflow Trigger`

| Field | Detail |
|---|---|
| Input Mode | Toggle between Text input and File input (both supported by the trigger — a vendor may submit organization details, a URL, uploaded documents, or direct capability text, in any combination) |
| Description | A vendor submits organization details, a known website URL, uploaded documents, or direct capability information for processing. |
| Input | Vendor organization details; a public website URL; one or more uploaded documents; and/or free-text capability descriptions — supplied by the vendor in a single onboarding submission |
| Output / Handoff | Raw submission payload passed as workflow input into Milestone 1 ('Ingest Vendor Sources and Build DNA Draft') |
| Human Interaction | Yes — this is the vendor's own data-entry action that starts the workflow (not an approval/decision gate, but the initiating human action) |
| Data Transfer | Inbound only, from the vendor-facing intake UI into the workflow. No external system calls at this node. |

### 5.2 Milestone 1 — Ingest Vendor Sources and Build DNA Draft

**`STEP / MILESTONE 1 · Ingest Vendor Sources and Build DNA Draft`**

| Field | Detail |
|---|---|
| Description | Take in whatever mix of website URL, uploaded documents, and direct text input the vendor submitted, crawl/ingest each source in parallel (no source blocks another), and consolidate everything into one structured Vendor Solution DNA draft — Capabilities grouped by category, each with sourced Evidence, an explicit verificationStatus, and any cross-source conflicts preserved rather than silently resolved. Output is a draft only, not yet vendor-reviewed or published. |
| Execution Model | Agents assigned to this step execute in parallel and can communicate internally to collaborate (builder-level note). |
| Input | Trigger payload: URL / documents / direct text |
| Output | Draft Vendor Solution DNA (Capability + Evidence records), persisted but unpublished |
| Human Interaction | None within this milestone |

#### 5.2.1 Agent — Vendor Intelligence Agent (instance 1)

| Field | Detail |
|---|---|
| Agent Persona (base, shared by both instances) | You are the Vendor Intelligence Agent. You convert raw vendor material — websites, documents, direct input — into a structured, source-linked Vendor Solution DNA. You behave like a meticulous technical librarian, not a salesperson: you extract and classify what is actually there, you never infer a capability the source doesn't support, and you never resolve a contradiction between two vendor sources yourself — you flag it for the vendor to resolve. Every claim you record carries its source and a verification status. You do not publish anything the vendor hasn't approved. |
| Step Instructions (Milestone 1 specific) | Create one deliverable: the Vendor Solution DNA draft (a set of Capability records, each with a CapabilityCategory — product/service/solution/feature/integration/industry/consulting/use_case/constraint, a verificationStatus of verified/modelled/unverified/pending, and Evidence entries with sourceLabel/sourceType/snippet). Tool sequencing: run 'Crawl Known Vendor Website' and 'Ingest Vendor Documents and Direct Inputs' independently and in parallel — they are alternate, non-blocking intake channels (a vendor may supply a website, documents, direct input, or any combination, in any order) — then run 'Save Vendor Solution DNA Draft' only after every source from this submission has finished processing, since it persists one consolidated draft rather than one per source. Keep all claims tied to their source, set each capability's verificationStatus explicitly, preserve conflicts instead of resolving them yourself, and separate explicit vendor statements from inferred or missing information. This draft feeds the vendor-facing Solution DNA review screen (a CapabilityCard grid grouped by category, each showing its evidence snippets) — do not publish the DNA or make buyer-facing claims in this step. |

#### 5.2.2 Tool — Crawl Known Vendor Website

`LIVE INTEGRATION – Web Crawler`

| Field | Detail |
|---|---|
| Description / Instructions | Crawl the vendor-supplied public HTTP(S) URL plus same-site pages a vendor would reasonably expect to be read (product/solution pages, pricing, case studies, integrations, about/company) — do not wander into unrelated domains or paywalled/login-gated pages. For each page, extract only factual, sourceable claims about what the vendor offers (products, services, features, integrations, industries served, constraints) — skip marketing filler, testimonials without specifics, and navigation/boilerplate text. For every extracted claim, create a VendorSource entry with sourceType 'website', the exact page URL, and a short sourceLabel (e.g. page title), plus an Evidence snippet that is a verbatim excerpt (not a paraphrase) so the claim can be traced back to its exact wording. Runs independently and in parallel with 'Ingest Vendor Documents and Direct Inputs' — do not wait for it and do not wait to be waited for. Output feeds directly into this agent's own consolidation into the Vendor Solution DNA draft; do not attempt to deduplicate or reconcile against other sources yourself — that happens once, downstream, after all sources for this submission are in. |
| Input | Vendor-supplied public website URL (from trigger) |
| Output | VendorSource entries (sourceType = website, page URL, sourceLabel) + verbatim Evidence snippets, passed into the agent's context for consolidation |
| Human Interaction | None |
| Data Transfer | Outbound HTTP(S) fetch to the vendor's public website (external call); inbound extracted content returned to the agent |
| Sequencing | Runs in parallel with 'Ingest Vendor Documents and Direct Inputs'; both must complete before 'Save Vendor Solution DNA Draft' runs |

#### 5.2.3 Tool — Ingest Vendor Documents and Direct Inputs

`INTERNAL – Reads Workflow Input`

| Field | Detail |
|---|---|
| Description / Instructions | Accept whatever mix of vendor-uploaded documents (spec sheets, case studies, decks, pricing lists) and direct free-text input the vendor submits in this onboarding session — either channel alone, or both together, is valid. For documents, extract factual offering claims per file and keep the original filename/section as the sourceLabel; do not summarize away specifics like version numbers, integration names, or industry qualifiers. For direct text input, treat each distinct statement as its own claim rather than merging the whole submission into one blob. For every claim, create a VendorSource (sourceType 'document' or 'direct_input' as appropriate) and an Evidence entry with a verbatim snippet — never paraphrase the source text in the Evidence field, since paraphrase breaks traceability. Runs independently and in parallel with 'Crawl Known Vendor Website' — do not wait for it and do not wait to be waited for; both feed the same downstream consolidation step. Flag anything ambiguous (e.g. a claim with no clear product/feature scope) rather than guessing its CapabilityCategory — leave that categorization decision to consolidation. |
| Input | Uploaded documents and/or direct free-text input, taken directly from the trigger's File input / Text input payload |
| Output | VendorSource entries (sourceType = document \| direct_input) + verbatim Evidence snippets, passed into the agent's context |
| Human Interaction | None (consumes what the vendor already submitted at the trigger — no separate prompt here) |
| Data Transfer | Internal only — reads the workflow's own input payload; no external system call |
| Sequencing | Runs in parallel with 'Crawl Known Vendor Website' |

#### 5.2.4 Tool — Save Vendor Solution DNA Draft

`⚠ SIMULATED – Needs Backend Wiring`

| Field | Detail |
|---|---|
| Description / Instructions | Run only after every intake source from this submission has finished — both 'Crawl Known Vendor Website' and 'Ingest Vendor Documents and Direct Inputs' (whichever ran, since either or both may be present) — because this saves one consolidated draft, not one per source. Merge all extracted claims into Capability records grouped by CapabilityCategory (product/service/solution/feature/integration/industry/consulting/use_case/constraint). Where two sources describe the same capability consistently, combine their Evidence under one Capability rather than duplicating it; where sources conflict, keep both claims and their Evidence attached to the same Capability rather than silently picking one — conflicts get resolved later by the vendor, not by this tool. Set each capability's verificationStatus: verified only if a source directly and unambiguously states it, modelled if it's a reasonable inference from stated facts (and note the inference), unverified if a source implies it but doesn't confirm it, pending if it needs vendor clarification. Persist the full draft — this becomes the vendor-facing Solution DNA review screen (a CapabilityCard grid grouped by category, each card showing its evidence snippets) shown next in 'Request Vendor DNA Approval'. Do not publish anything here — this is a draft save only. This tool's response returns each saved capability in full — id, name, category, verificationStatus, sourceLocation, tags, and evidence — under 'capabilities' in the response body, not just bare ids under savedCapabilityIds; the next milestone's approval step reads from that 'capabilities' array. |
| Input | Consolidated Capability + Evidence records assembled by the agent from the two intake tools' outputs |
| Output | Persisted draft record; response returns full capability objects (id, name, category, verificationStatus, sourceLocation, tags, evidence) under a `capabilities` array, plus a `vendorId` used by Milestone 2 |
| Human Interaction | None |
| Data Transfer | Write to the vendor-capability persistence layer — currently **SIMULATED** in the builder. Needs a real backend/database write API for production integration. |
| Sequencing | Join/barrier step — runs only after both 'Crawl Known Vendor Website' and 'Ingest Vendor Documents and Direct Inputs' have completed. Marks the end of Milestone 1. |

### 5.3 Milestone 2 — Review and Publish Vendor Solution DNA

**`STEP / MILESTONE 2 · Review and Publish Vendor Solution DNA`**

| Field | Detail |
|---|---|
| Description | Present the draft Vendor Solution DNA to the vendor, capability by capability, in plain language with each claim's evidence and any cross-source conflicts, so the vendor can approve, revise, or reject each one. Publish only the capabilities the vendor explicitly approved. This is the last step of the Vendor-Side workflow — published capabilities become visible to buyers immediately after; any buyer questions the DNA can't answer, and any meeting scheduling that follows, are handled in the Buyer Solution Platform workflow, not here. |
| Input | vendorId handed off from Milestone 1's 'Save Vendor Solution DNA Draft' response |
| Output | Published, buyer-visible Vendor Solution DNA; a full audit trail of per-capability vendor decisions |
| Human Interaction | Yes — the central human-in-the-loop gate of the whole workflow (see Section 4) |

#### 5.3.1 Agent — Vendor Intelligence Agent (instance 2)

| Field | Detail |
|---|---|
| Agent Persona | Same base persona as instance 1 (Section 5.2.1) — the Vendor Intelligence Agent is one library agent reused across both milestones with different step instructions. |
| Step Instructions (Milestone 2 specific) | Create one deliverable: the Vendor Solution DNA publication decision record. Step 1 (mandatory, always first) — call 'Query Draft Vendor Capabilities' with the vendorId from the prior milestone's save call. Its response is the only source of full capability data (name, evidence, verificationStatus) available in this milestone — the prior milestone's tool result is not visible here, so this call cannot be skipped and nothing here should be inferred from savedCapabilityIds or summary counts alone. Step 2 — for each capability returned, run 'Request Vendor DNA Approval' one at a time and wait for the vendor's explicit per-capability decision before moving to the next capability. Step 3 — only once every capability has a decision, run 'Publish Approved Vendor Solution DNA' with all collected decisions, publishing only capabilities the vendor confirmed as verified or modelled — never publish before an approval decision exists for a capability. Retain rejected, conflicting, or still-unverified/pending capabilities as unpublished rather than dropping them, so the vendor can revisit them later. Do not silently amend Evidence or publish capabilities the vendor has not confirmed. Published capabilities become immediately visible to the Buyer Solution Platform's Solution Matching Agent and to buyers browsing /buyer/vendors. This is the terminal step of the vendor-side workflow — capability-frontier questions and meeting scheduling that follow a buyer's exploration are handled entirely inside the Buyer Solution Platform workflow, not here. |

#### 5.3.2 Tool — Query Draft Vendor Capabilities (runs first)

`⚠ SIMULATED – Needs Backend Wiring`

| Field | Detail |
|---|---|
| Description / Instructions | Fetches this vendor's full draft Capability and Evidence records saved by 'Save Vendor Solution DNA Draft' — each with id, name, category, verificationStatus, sourceLocation, tags, and evidence. Call this first in this milestone, before 'Request Vendor DNA Approval': that approval tool can only present one capability at a time, and this is the tool that supplies the name, evidence, and status it needs. Input: vendorId (the vendor.id from the prior milestone's save call). Do not skip this call and proceed straight to approval or publish — without it there is no capability data to show the vendor or to decide on. |
| Input | vendorId, carried over from Milestone 1's 'Save Vendor Solution DNA Draft' response |
| Output | Full list of draft Capability + Evidence records: id, name, category, verificationStatus, sourceLocation, tags, evidence |
| Human Interaction | None |
| Data Transfer | Read from the vendor-capability persistence layer — currently **SIMULATED**. Needs a real backend/database read API for production integration. |
| Sequencing | Must run first in Milestone 2, before any 'Request Vendor DNA Approval' calls |

#### 5.3.3 Tool — Request Vendor DNA Approval (looped, per capability) ⭐ HUMAN-IN-THE-LOOP

`⭐ HUMAN-IN-THE-LOOP – Ask Human for Approval`

| Field | Detail |
|---|---|
| Description / Instructions | Call this tool once per pending Capability, and only once per capability — never try to present or resolve more than one in a single call. This tool's response is a fixed choice among the offered options; it has no field for the vendor to type a capability name or id into, so the only way a decision can bind unambiguously to one capability is for the call itself to be about exactly that one capability. Each call's request must show exactly one pending Capability as a clear, scannable card — its exact name, capabilityId, source Evidence snippet(s), and current verificationStatus (verified/modelled/unverified/pending) — in plain language, no jargon, plus a one-line note of how many capabilities remain after this one. Offer four choices: Approve as-is (decision: approved) — publish this capability's extracted claim unchanged; Revise then approve (decision: approved) — ask what to change, then approve the edited text/category; Reject (decision: rejected) — keep it saved but unpublished; Leave pending (decision: escalated) — decide later, no change. Where two sources conflict on this one capability, surface both snippets and let the vendor pick or reconcile rather than silently averaging or picking one. As soon as this call resolves, call this tool again for the next pending capability — keep looping until every capability has a decision or the vendor stops; stopping partway is valid, and any capability this loop hasn't reached yet simply stays pending. Record each resolved decision as {capabilityId, verificationStatus, description (only if vendor-edited), decidedAt} — this is exactly the shape 'Publish Approved Vendor Solution DNA' expects in its decisions array. This is the approval gate for the whole DNA draft — Publish must never run on a capability that hasn't had its own call through this tool, but should be called next as soon as at least one capability has an approved or rejected decision, not only once every capability has been decided. |
| Input | One Capability record at a time (id, name, category, verificationStatus, evidence), drawn from 'Query Draft Vendor Capabilities' result set |
| Output | One human decision per call: `{ capabilityId, decision: approved \| rejected \| escalated, verificationStatus, description (if vendor-edited), decidedAt }` |
| Human Interaction | ⭐ **YES** — the vendor reviews one capability card and chooses one of 4 actions (Approve as-is / Revise then approve / Reject / Leave pending). This is the sole approval gate in the workflow. |
| Data Transfer | One UI round-trip to the frontend per capability — no external system call, but potentially many round-trips per vendor (one per capability) |
| Sequencing | Looped, one call per pending capability; strictly after 'Query Draft Vendor Capabilities'; each capability's own decision must exist before 'Publish' can include it |

#### 5.3.4 Tool — Publish Approved Vendor Solution DNA (runs last)

`⚠ SIMULATED – Needs Backend Wiring`

| Field | Detail |
|---|---|
| Description / Instructions | Publish only capabilities that carry an explicit Approve decision from 'Request Vendor DNA Approval' (verificationStatus verified or modelled) — never publish a capability that is still pending, was rejected, or was never reviewed. Copy the vendor-approved text (including any vendor revisions made during approval), its CapabilityCategory, verificationStatus, and full Evidence set into the buyer-visible published Vendor Solution DNA; do not alter wording or evidence during publish. Rejected and still-pending capabilities remain saved but unpublished, so the vendor can return and decide on them in a later session without losing that work. This publish action is what makes the vendor immediately visible and matchable on /buyer/vendors and to the Buyer Solution Platform's Solution Matching Agent — nothing before this step is buyer-facing. This is the terminal step of the Vendor-Side workflow: no capability-frontier questions or meeting scheduling happen here or after — those live entirely in the Buyer Solution Platform's Grounded Exploration and Human Handoff step, which is triggered later by buyer activity, not from this workflow. |
| Input | Collected decisions array from all 'Request Vendor DNA Approval' calls: `[{ capabilityId, verificationStatus, description, decidedAt }, …]` |
| Output | Buyer-visible published Vendor Solution DNA (approved capability records made live). Vendor becomes visible/matchable at /buyer/vendors and to the Buyer Solution Platform's Solution Matching Agent. |
| Human Interaction | None directly (executes on decisions already collected by the previous tool) |
| Data Transfer | Write to the vendor-capability persistence layer, plus a cross-workflow visibility change consumed by the separate Buyer Solution Platform — currently **SIMULATED**. Needs a real backend/API write for production integration, and a defined contract for how the Buyer Solution Platform reads newly-published data. |
| Sequencing | Terminal node of the entire Vendor-Side workflow. May run as soon as at least one capability has a decision — it does not need to wait for every capability to be resolved. |

---

## 6. Cross-Workflow Boundary — Buyer Solution Platform

The Deck-less Pitch product contains at least one other workflow — the "Buyer Solution Platform" — which is referenced by name inside this workflow's node instructions but is not itself part of this canvas or this PRD. It is documented here only to make the integration boundary explicit.

| Field | Detail |
|---|---|
| Handoff trigger | The moment 'Publish Approved Vendor Solution DNA' (Section 5.3.4) runs, published capabilities become visible to buyers |
| Handoff surface | Buyer-facing route /buyer/vendors, and the Buyer Solution Platform's Solution Matching Agent |
| What happens next (out of scope here) | Buyer questions the DNA can't answer are escalated via the Buyer Solution Platform's own "Grounded Exploration and Human Handoff" step; meeting scheduling also happens there, triggered by buyer activity, not by this workflow |
| Why this matters for integration | Frontend/backend work for the vendor side should treat "publish" as the final observable event it owns. Anything after that (buyer-side UI, matching, escalation) is a separate integration surface with its own PRD. |

### 6.1 Adjacent agents (context only — not part of this workflow)

These agents exist in the same Yoxa.ai agent library and are consumed by the Buyer Solution Platform workflow. They are included here only so frontend/backend teams understand what downstream expects from this workflow's published output.

| Agent | Role |
|---|---|
| Buyer Discovery Agent | Understands a buyer's business problem and current reality through adaptive, minimal questioning — never a fixed form. Produces structured business profiles, not transcripts. |
| Solution Matching Agent | Compares buyer requirements against published vendor capabilities and scores fit strictly on evidence (Strong Match / Partial Match / Unmatched), always alongside the gap. |
| Solution Model Agent | Turns an approved fit-and-gap assessment into a personalized, quantified solution narrative; every number is labelled Verified or Modelled. |
| Grounding and Escalation Agent | The trust layer for everything the buyer sees — responds Verified / Modelled / Unverified, and escalates pricing, discounts, contract terms, SLAs and negotiation to a human, always. |

---

## 7. Data Transfer & Integration Surface Summary

Consolidated view of every external / backend touchpoint across the workflow, for backend and API scoping.

| Node | Transfer Type | Detail |
|---|---|---|
| vendor_source_submission | Inbound (UI → workflow) | Vendor intake form data: org details, URL, files, free text |
| Crawl Known Vendor Website | Outbound (external) | Live HTTP(S) fetch of the vendor's public website — real integration, already functional |
| Ingest Vendor Documents and Direct Inputs | Internal | Reads the trigger's own payload; no external call |
| Save Vendor Solution DNA Draft | Backend write — **SIMULATED** | Persists consolidated draft capabilities; needs real DB/API |
| Query Draft Vendor Capabilities | Backend read — **SIMULATED** | Fetches saved draft capabilities by vendorId; needs real DB/API |
| Request Vendor DNA Approval | UI round-trip (human) | Frontend approval card per capability; not an external system call, but a required human-in-the-loop UI contract |
| Publish Approved Vendor Solution DNA | Backend write + cross-workflow — **SIMULATED** | Publishes approved capabilities; must become visible to the Buyer Solution Platform's Solution Matching Agent and at /buyer/vendors |

---

## 8. Frontend Action & Trigger Mapping

Recommended mapping from each backend node to a concrete frontend action, trigger, or UI surface. This is the primary deliverable this PRD exists to produce — use it to scope frontend components and the events that fire them.

| Backend Node | Frontend Trigger / Event | UI Surface / Component |
|---|---|---|
| vendor_source_submission | "Submit" click on the vendor intake form fires the workflow-trigger event with the composed payload (text and/or files) | Vendor Onboarding page: URL field, multi-file uploader, free-text textarea, single submit action |
| Milestone 1 running (Crawl + Ingest, in parallel) | No user action — async processing state begins immediately after submission | "Analyzing your website and documents…" progress/loading state; consider a live status feed if the builder exposes per-tool progress events |
| Save Vendor Solution DNA Draft completes | Backend-completion event should trigger a frontend navigation/state transition into the review screen | Transition to "Solution DNA Review" screen; store the returned vendorId client-side for Milestone 2 calls |
| Query Draft Vendor Capabilities | Fires automatically on review-screen mount/load, using the stored vendorId | Populates the CapabilityCard grid, grouped by CapabilityCategory |
| Request Vendor DNA Approval (looped) | Per-card user action: 4 explicit buttons — Approve as-is / Revise then approve / Reject / Leave pending. Each click fires one decision call and immediately advances to the next pending capability. | CapabilityCard component: capability name, evidence snippet(s), verificationStatus badge, conflict callout (if two sources disagree), "N remaining" counter, 4-button action row, optional inline edit field for "Revise then approve" |
| Publish Approved Vendor Solution DNA | Auto-fires once at least one decision exists (per backend instructions it need not wait for all); frontend should offer an explicit "Publish now" / "Finish later" affordance once the vendor has made at least one decision | "Your Solution DNA is live" confirmation screen; reflect vendor's new visibility state (e.g. "Visible to buyers" badge) and link to /buyer/vendors preview if available |

> **FRONTEND DESIGN NOTE** — The approval loop (Request Vendor DNA Approval) is the only node in this workflow that must be modeled as a repeatable, stateful frontend interaction rather than a one-shot call. Design the CapabilityCard component to be re-invocable in place (no full navigation) so the vendor can move through all pending capabilities without losing context.

---

## 9. Integration Readiness Checklist

### 9.1 Backend work required

- Replace the Simulated Output on 'Save Vendor Solution DNA Draft' with a real write API that persists Capability + Evidence records and returns the full capabilities array plus a vendorId, exactly as currently mocked.
- Replace the Simulated Output on 'Query Draft Vendor Capabilities' with a real read API keyed by vendorId, returning id, name, category, verificationStatus, sourceLocation, tags, and evidence for every draft capability.
- Replace the Simulated Output on 'Publish Approved Vendor Solution DNA' with a real write API that accepts the decisions array and updates capability visibility, plus confirm the contract by which the Buyer Solution Platform's Solution Matching Agent and /buyer/vendors pick up newly-published data.
- Confirm 'Crawl Known Vendor Website' (already a live web_crawler integration) is production-hardened: domain scoping, paywall/login detection, and rate limiting for arbitrary vendor URLs.

### 9.2 Frontend work required

- Vendor intake form (Text input / File input) that fires the vendor_source_submission trigger with a single composed payload.
- Async progress/status UI for Milestone 1 while Crawl + Ingest + Save run.
- Solution DNA Review screen that calls Query Draft Vendor Capabilities on load and renders a CapabilityCard grid grouped by category.
- Repeatable CapabilityCard approval component implementing the 4-choice decision contract (Approve as-is / Revise then approve / Reject / Leave pending), looping without full navigation, with a live remaining-count indicator.
- Publish confirmation / "now visible to buyers" state, reflecting the terminal event of this workflow.

### 9.3 Open questions for stakeholders

- Should 'Publish Approved Vendor Solution DNA' fire automatically after each decision, after every capability is decided, or only on an explicit vendor "Publish" action? Current agent instructions allow it to run as soon as one decision exists — confirm the desired UX.
- What happens if a vendor closes the browser mid-approval-loop? Confirm that "pending" capabilities persist correctly and the vendor can resume the review screen later.
- Is there a rate limit or page cap needed for 'Crawl Known Vendor Website' on very large vendor sites?
- Define the exact contract (event, webhook, or shared read) by which the Buyer Solution Platform workflow picks up newly published capabilities.

---

## Appendix A: Test Fixtures Present in Builder

Sample documents currently uploaded in the Yoxa.ai workspace, used to exercise 'Ingest Vendor Documents and Direct Inputs' during design/test. Not part of the production workflow definition.

- AWS_Supply_Chain_… .pdf — Ready
- Northstar_Platform_… .pdf — Ready
- Northstar_Platform_… .pdf (second file) — Ready

## Appendix B: Version Reference

| Field | Value |
|---|---|
| Documented Version | v21 — "added Query Draft Vendor Capabilities tool node, wired to review agent, updated step instructions" — Aug 18, 2026, 6:18 PM |
| Prior Version | v20 — "save-draft returns full capabilities+evidence" — Aug 18, 2026, 6:04 PM |
| Note | All node content in this PRD was captured directly from the live v21 builder configuration on the date of this document. |
