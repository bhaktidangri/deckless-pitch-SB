# Technical Stack & Architecture Plan

## Deck-less Pitch --- Next.js + Supabase + YOKA.ai

**Architecture principle:** Next.js builds the product experience,
Supabase owns application state and backend primitives, and YOKA.ai
provides the agentic intelligence layer.

------------------------------------------------------------------------

# 1. Architecture Summary

The recommended hackathon architecture is:

``` text
                         ┌──────────────────────┐
                         │       USERS          │
                         │ Vendor / Buyer /     │
                         │ Admin                │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       NEXT.JS        │
                         │    WEB PORTAL        │
                         │                      │
                         │ Vendor Portal        │
                         │ Buyer Portal         │
                         │ Solution Workspace   │
                         │ Admin Dashboard      │
                         │ Chat UI              │
                         └──────────┬───────────┘
                                    │
                            Server/API Layer
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
             SUPABASE            YOKA.ai          External
                  │              AGENTS             APIs
        ┌─────────┼─────────┐       │
        │         │         │       │
        ▼         ▼         ▼       ▼
   PostgreSQL  Storage    Auth   Agentic workflows
        │
        ▼
   PRODUCT STATE
```

### Mental model

-   **Next.js = product/interface**
-   **Supabase = data, identity, storage, security, realtime**
-   **YOKA.ai = intelligence and agentic workflows**
-   **External APIs = optional integrations/data sources**

------------------------------------------------------------------------

# 2. Technology Responsibilities

  -----------------------------------------------------------------------
  Technology                          Responsibility
  ----------------------------------- -----------------------------------
  Next.js                             Main web application and UI

  React                               Interactive UI components

  Tailwind CSS                        UI styling

  Next.js Server/API                  Secure server-side application
                                      logic and integration layer

  Supabase PostgreSQL                 Primary application database

  Supabase Auth                       Authentication

  Supabase Storage                    Vendor/buyer files and documents

  Supabase Realtime                   Live application updates

  Supabase Row Level Security         Multi-tenant data access control

  YOKA.ai                             Agentic reasoning, workflows,
                                      discovery, matching, Q&A

  External APIs                       Optional company/data/integration
                                      sources

  Vercel                              Recommended Next.js deployment
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Core Architecture Principle

## Supabase is the source of truth.

YOKA.ai is **not** the application's database.

YOKA may generate:

-   A recommendation
-   A capability extraction
-   A buyer question
-   A gap
-   A solution model
-   A response
-   An escalation decision

But the application should persist the relevant result in Supabase.

For example, YOKA may determine:

``` text
CloudNova is a strong match.
```

The application stores:

``` text
recommendation
buyer_id
vendor_id
reason
confidence
evidence
created_at
```

This gives your platform ownership over the product state and prevents
the AI layer from becoming the system of record.

------------------------------------------------------------------------

# 4. Why Next.js

Next.js should contain the actual portal that vendors and buyers use.

## Vendor routes

``` text
/vendor
/vendor/onboarding
/vendor/sources
/vendor/solution-dna
/vendor/buyers
/vendor/capability-frontier
/vendor/meetings
```

## Buyer routes

``` text
/buyer
/buyer/discover
/buyer/vendors
/buyer/requirements
/buyer/solution
/buyer/chat
/buyer/scenarios
/buyer/handoff
```

## Admin routes

``` text
/admin
/admin/vendors
/admin/buyers
/admin/audit
/admin/platform
```

------------------------------------------------------------------------

# 5. Next.js Application Responsibilities

Next.js should handle:

-   UI rendering
-   Forms
-   Buyer discovery flow
-   Vendor onboarding
-   Solution workspace
-   Pitch presentation
-   Chat interface
-   Scenario controls
-   Dashboards
-   Loading/error states
-   Server-side validation
-   Authorization checks
-   Calling YOKA securely
-   Calling Supabase
-   Webhook handling
-   Generating signed file URLs
-   Application-specific business logic

The browser should not directly own sensitive integration credentials.

------------------------------------------------------------------------

# 6. Recommended Next.js Structure

A possible structure:

``` text
app/
├── (auth)/
│   ├── login/
│   └── signup/
│
├── vendor/
│   ├── dashboard/
│   ├── onboarding/
│   ├── sources/
│   ├── solution-dna/
│   ├── buyers/
│   └── capability-frontier/
│
├── buyer/
│   ├── discover/
│   ├── vendors/
│   ├── requirements/
│   ├── solution/
│   ├── chat/
│   └── handoff/
│
├── admin/
│
├── api/
│   ├── yoka/
│   ├── vendor/
│   ├── buyer/
│   └── webhooks/
│
├── components/
├── lib/
├── services/
└── types/
```

The exact structure can change, but the key separation is:

-   UI
-   Server/API
-   Data access
-   YOKA integration
-   Shared types

------------------------------------------------------------------------

# 7. Supabase Responsibilities

Supabase acts as the backend foundation.

Use it for:

1.  PostgreSQL database
2.  Authentication
3.  File storage
4.  Row Level Security
5.  Realtime updates

------------------------------------------------------------------------

# 8. Supabase PostgreSQL

PostgreSQL stores the application's structured state.

Core tables should include:

## Organizations

``` text
organizations
- id
- name
- type
- created_at
```

Types:

``` text
vendor
buyer
admin/internal
```

## Users / Organization Membership

``` text
organization_members
- id
- user_id
- organization_id
- role
- created_at
```

Possible roles:

``` text
vendor_admin
vendor_member
buyer_admin
buyer_member
platform_admin
```

------------------------------------------------------------------------

# 9. Vendor Tables

## vendors

``` text
vendors
- id
- organization_id
- company_name
- website
- industry
- description
- verification_status
- created_at
- updated_at
```

## vendor_sources

``` text
vendor_sources
- id
- vendor_id
- source_type
- source_url
- storage_path
- processing_status
- created_at
- updated_at
```

Source types:

``` text
website
pdf
ppt
doc
spreadsheet
manual
other
```

------------------------------------------------------------------------

# 10. Vendor Solution DNA Tables

## solution_capabilities

``` text
solution_capabilities
- id
- vendor_id
- name
- description
- category
- verification_status
- source_id
- source_location
- created_at
- updated_at
```

Possible categories:

``` text
product
service
solution
feature
integration
industry
consulting
use_case
constraint
```

## solution_sources

If needed, maintain a normalized source/evidence table:

``` text
solution_evidence
- id
- capability_id
- source_id
- source_text
- source_location
- evidence_type
- created_at
```

This allows claims to be traced back to evidence.

------------------------------------------------------------------------

# 11. Buyer Tables

## buyers

``` text
buyers
- id
- organization_id
- company_name
- industry
- company_size
- created_at
- updated_at
```

## buyer_requirements

``` text
buyer_requirements
- id
- buyer_id
- requirement
- priority
- status
- source
- created_at
- updated_at
```

## client_reality_profiles

``` text
client_reality_profiles
- id
- buyer_id
- current_technology
- current_cost
- usage
- processes
- pain_points
- goals
- constraints
- created_at
- updated_at
```

For a production system, frequently changing profile attributes may be
normalized into separate tables or JSONB structures. For the hackathon,
a practical hybrid structure is acceptable.

------------------------------------------------------------------------

# 12. Solution Model Tables

## solution_models

``` text
solution_models
- id
- buyer_id
- vendor_id
- version
- status
- created_at
- updated_at
```

## solution_matches

``` text
solution_matches
- id
- solution_model_id
- buyer_requirement_id
- capability_id
- match_status
- confidence
- reasoning
- created_at
```

Possible statuses:

``` text
strong_match
partial_match
unmatched
requires_validation
```

------------------------------------------------------------------------

# 13. Capability Frontier Tables

``` text
capability_frontier
- id
- buyer_id
- vendor_id
- solution_model_id
- question
- requirement
- context
- evidence_checked
- reason_unresolved
- status
- vendor_response
- created_at
- updated_at
```

Possible statuses:

``` text
open
vendor_review
vendor_answered
resolved
closed
```

This is one of the product's differentiating data structures.

------------------------------------------------------------------------

# 14. Conversation Tables

## conversations

``` text
conversations
- id
- buyer_id
- vendor_id
- solution_model_id
- created_at
- updated_at
```

## messages

``` text
messages
- id
- conversation_id
- role
- content
- response_status
- created_at
```

Possible response statuses:

``` text
verified
modelled
escalated
```

For important responses, store references to supporting evidence.

------------------------------------------------------------------------

# 15. Audit Tables

``` text
audit_events
- id
- organization_id
- actor_type
- actor_id
- agent_name
- action
- entity_type
- entity_id
- input_reference
- output_reference
- source_references
- created_at
```

This supports the product requirement that important AI claims remain
traceable.

------------------------------------------------------------------------

# 16. Supabase Storage

Use Supabase Storage for uploaded files.

Example:

``` text
vendor-documents/
    vendor-id/
        brochure.pdf
        pricing.pdf
        technical-docs.pdf
```

PostgreSQL should store the metadata:

``` text
vendor_sources
- vendor_id
- source_type
- storage_path
- filename
- status
```

The actual binary document remains in Storage.

------------------------------------------------------------------------

# 17. Authentication

Use Supabase Auth for:

-   Sign up
-   Login
-   Session management
-   Password reset
-   Email verification
-   Organization membership

The application should associate each authenticated user with an
organization and role.

Example:

``` text
User
 │
 ▼
organization_membership
 │
 ├── organization_id
 └── role
```

------------------------------------------------------------------------

# 18. Multi-Tenancy

This is critical.

Vendor A must never access:

-   Vendor B's Solution DNA
-   Vendor B's documents
-   Vendor B's buyers

Buyer A must never access:

-   Buyer B's private business data
-   Buyer B's solution model
-   Buyer B's conversations

Use Supabase **Row Level Security (RLS)** to enforce this at the
database layer.

The application should not rely only on frontend route protection.

------------------------------------------------------------------------

# 19. YOKA.ai's Role

YOKA.ai should be treated as the **agentic intelligence layer**.

It can power workflows such as:

### Vendor Intelligence

-   Website/document understanding
-   Service extraction
-   Product extraction
-   Capability extraction
-   Source mapping
-   Conflict detection

### Buyer Discovery

-   Requirement understanding
-   Adaptive questioning
-   Business context collection
-   Gap identification

### Solution Matching

-   Requirement-to-capability matching
-   Relevance reasoning
-   Gap analysis
-   Recommendation

### Solution Generation

-   Personalized pitch content
-   Business case reasoning
-   Scenario analysis
-   Buyer-facing explanations

### Grounding and Escalation

-   Evidence checking
-   Claim validation
-   Confidence determination
-   Capability Frontier creation
-   Human escalation

------------------------------------------------------------------------

# 20. Important Separation: YOKA vs Application Backend

Do not design:

``` text
Browser → YOKA → everything
```

Instead:

``` text
Browser
   ↓
Next.js
   ↓
Application Server
   ├── Supabase
   └── YOKA
```

The application remains the controller.

YOKA performs the agentic work requested by the application.

------------------------------------------------------------------------

# 21. Secure YOKA Integration

Never expose YOKA credentials in browser code.

Do not do:

``` text
Browser → YOKA API
```

Use:

``` text
Browser
   ↓
Next.js Server
   ↓
YOKA
```

YOKA API credentials should remain server-side.

------------------------------------------------------------------------

# 22. Vendor Onboarding Technical Flow

Example: vendor enters its website.

``` text
Vendor
  ↓
Next.js Vendor Portal
  ↓
Next.js Server
  ↓
Supabase
```

Create a source record:

``` text
vendor_sources
status = pending
```

Then invoke YOKA:

``` text
Next.js Server
  ↓
YOKA Vendor Intelligence Agent
```

YOKA processes the source and returns structured output.

The application validates and persists it:

``` text
YOKA
  ↓
Next.js Server
  ↓
Supabase PostgreSQL
  ↓
solution_capabilities
```

Next.js then displays:

> Solution DNA generated.

------------------------------------------------------------------------

# 23. Important: Store Evidence, Not Just AI Summaries

Do not store only:

``` json
{
  "capability": "Cloud migration"
}
```

Store capability + evidence:

``` json
{
  "capability": "Cloud migration",
  "description": "....",
  "verification_status": "verified",
  "source": {
    "type": "website",
    "url": "...",
    "section": "..."
  }
}
```

This is essential for later grounding.

------------------------------------------------------------------------

# 24. Buyer Discovery Technical Flow

Buyer enters:

> We want to reduce cloud costs.

``` text
Buyer
 ↓
Next.js
 ↓
Next.js Server
 ↓
YOKA Buyer Discovery Agent
```

YOKA returns the next relevant question.

Next.js displays it.

Buyer answers.

The answer is persisted:

``` text
Next.js
 ↓
Supabase
 ↓
buyer_requirements
client_reality_profiles
```

The relevant context can then be sent back to YOKA for the next step.

------------------------------------------------------------------------

# 25. Vendor Matching Flow

The application gathers:

``` text
Client Reality Profile
+
Vendor Solution DNA
```

Then requests matching from YOKA.

YOKA produces:

``` text
Requirement → Capability → Match status → Evidence
```

The application persists:

``` text
solution_matches
```

Next.js renders the result.

------------------------------------------------------------------------

# 26. Personalized Solution Generation

YOKA produces the reasoning/content.

For example:

``` text
Current situation
Business problem
Recommended capabilities
Expected impact
Assumptions
Evidence
Open questions
```

Next.js renders the experience.

Therefore:

> **YOKA decides/reasons/explains; Next.js presents and controls the
> product state.**

------------------------------------------------------------------------

# 27. Chat Architecture

The buyer's chatbot should operate only with approved context.

``` text
Buyer
 ↓
Next.js Chat UI
 ↓
Next.js Server
 ↓
Fetch relevant context from Supabase
 │
 ├── Vendor Solution DNA
 ├── Client Reality Profile
 ├── Solution Model
 ├── Evidence
 └── Conversation history
 ↓
YOKA Agent
 ↓
Grounding / reasoning
 ↓
Answer / Simulation / Escalation
 ↓
Supabase
 ↓
Next.js
 ↓
Buyer
```

The chatbot should not independently browse random information and treat
it as vendor truth.

------------------------------------------------------------------------

# 28. Evidence-Gated Responses

Use three states.

## VERIFIED

The vendor's Solution DNA or approved evidence supports the answer.

``` text
status = verified
```

The chatbot can answer.

## MODELLED

The answer can be calculated from buyer data and explicit assumptions.

``` text
status = modelled
```

The chatbot should show assumptions.

## ESCALATED

The available evidence is insufficient.

``` text
status = escalated
```

The chatbot should:

1.  Avoid making a claim.
2.  Explain that vendor confirmation is required.
3.  Create a Capability Frontier item.
4.  Notify the vendor.

------------------------------------------------------------------------

# 29. Capability Frontier Technical Flow

Example:

Buyer asks:

> Can you guarantee zero downtime during migration?

YOKA determines:

``` text
Migration support:
VERIFIED

Zero-downtime guarantee:
NOT VERIFIED
```

The application writes:

``` text
capability_frontier
status = open
```

Vendor dashboard queries open items and displays:

``` text
Buyer needs vendor confirmation

Requirement:
Zero-downtime migration

Context:
Kubernetes + legacy database

Evidence checked:
4 sources

Recommended expert:
Solutions Architect
```

------------------------------------------------------------------------

# 30. Realtime Updates

Supabase Realtime can support events such as:

-   New Capability Frontier item
-   Vendor response
-   Buyer message
-   Solution model updated
-   Vendor Solution DNA processing completed
-   Meeting status changed

Example:

``` text
Buyer asks question
       ↓
YOKA escalates
       ↓
Supabase capability_frontier updated
       ↓
Supabase Realtime
       ↓
Vendor dashboard
       ↓
"New buyer requirement needs attention"
```

------------------------------------------------------------------------

# 31. Dynamic Solution Model

When a buyer changes:

``` text
Users:
500 → 1,000
```

the system should:

``` text
Next.js
  ↓
Supabase update
  ↓
Trigger solution recalculation
  ↓
YOKA
  ↓
Updated model
  ↓
Supabase new version
  ↓
Next.js
```

Keep versions so that the system can explain how a result changed.

Example:

``` text
Solution Model v1
500 users

Solution Model v2
1,000 users
```

------------------------------------------------------------------------

# 32. Recommended API Boundaries

Keep a clean boundary between UI and services.

Example:

``` text
/api/vendors
/api/vendors/:id/sources
/api/vendors/:id/solution-dna

/api/buyers
/api/buyers/:id/requirements
/api/buyers/:id/solution

/api/solutions/:id
/api/solutions/:id/recalculate

/api/conversations
/api/conversations/:id/messages

/api/capability-frontier
/api/capability-frontier/:id

/api/yoka/vendor-ingest
/api/yoka/buyer-discovery
/api/yoka/match
/api/yoka/chat
/api/yoka/recalculate
```

Exact routes can change, but keep responsibilities separated.

------------------------------------------------------------------------

# 33. Recommended Server Flow

A generic YOKA request should look conceptually like:

``` text
POST /api/yoka/match

Input:
- buyer_id
- vendor_id
- solution_model_id

Server:
1. Authenticate user
2. Check organization permissions
3. Load approved context from Supabase
4. Build structured YOKA request
5. Call YOKA
6. Validate response
7. Persist result
8. Return result to UI
```

The browser should not decide which vendor data YOKA receives.

The server should assemble the approved context.

------------------------------------------------------------------------

# 34. Source-of-Truth Hierarchy in the Technical Architecture

``` text
             ┌──────────────────────┐
             │ Vendor Solution DNA  │
             │ Primary vendor truth │
             └──────────┬───────────┘
                        │
             ┌──────────▼───────────┐
             │ Buyer Reality Data   │
             │ Primary buyer truth  │
             └──────────┬───────────┘
                        │
             ┌──────────▼───────────┐
             │ Calculations / Rules │
             └──────────┬───────────┘
                        │
             ┌──────────▼───────────┐
             │ Approved External    │
             │ Sources              │
             └──────────┬───────────┘
                        │
             ┌──────────▼───────────┐
             │ General AI Knowledge │
             │ Context only         │
             └──────────────────────┘
```

For vendor capability claims, Vendor Solution DNA is authoritative.

------------------------------------------------------------------------

# 35. Suggested Frontend Components

Build reusable components such as:

``` text
SolutionCard
CapabilityCard
RequirementCard
EvidenceBadge
ConfidenceBadge
SourceDrawer
ScenarioSlider
ROIWidget
SolutionTimeline
CapabilityFrontierCard
ChatPanel
VendorMatchCard
PitchSection
DataInputForm
OrganizationSwitcher
```

This will make the solution workspace easier to evolve.

------------------------------------------------------------------------

# 36. UI States You Should Design

Every AI-driven component needs clear states:

### Loading

> Analyzing your requirements...

### Processing

> Building Vendor Solution DNA...

### Verified

> Verified against vendor documentation.

### Modelled

> Estimate based on your provided assumptions.

### Needs confirmation

> Vendor confirmation required.

### Error

> We could not complete this analysis. Try again.

### Stale

> Vendor information has changed. Recalculate solution.

These states make the AI feel trustworthy rather than magical.

------------------------------------------------------------------------

# 37. Recommended MVP Stack

## Frontend

``` text
Next.js
React
Tailwind CSS
```

## Backend

``` text
Next.js Server Actions / Route Handlers
```

## Database

``` text
Supabase PostgreSQL
```

## Authentication

``` text
Supabase Auth
```

## File storage

``` text
Supabase Storage
```

## Realtime

``` text
Supabase Realtime
```

## Security

``` text
Supabase Row Level Security
```

## Agentic layer

``` text
YOKA.ai
```

## Deployment

``` text
Vercel
Supabase
YOKA.ai
```

------------------------------------------------------------------------

# 38. Hackathon Implementation Priority

## P0 --- Must Have

### Vendor

-   Login
-   Vendor profile
-   Website/document upload
-   Solution DNA generation
-   Solution DNA review

### Buyer

-   Login
-   Requirement input
-   Adaptive discovery
-   Vendor recommendation
-   Vendor selection

### Core experience

-   Client Reality Profile
-   Vendor Solution DNA
-   Matching
-   Gap analysis
-   Personalized solution
-   Interactive solution workspace

### Agentic experience

-   Contextual chatbot
-   Evidence/verification status
-   One what-if scenario
-   Capability Frontier

### Human handoff

-   Vendor notification
-   Buyer/vendor context package
-   Schedule meeting CTA

------------------------------------------------------------------------

# 39. P1 --- Nice to Have

-   Multiple vendor comparison
-   More scenario types
-   More file types
-   More advanced ROI calculations
-   Realtime notifications
-   Vendor response workflow
-   Solution model version history
-   Better analytics
-   Public company data enrichment

------------------------------------------------------------------------

# 40. P2 --- Future

-   Enterprise integrations
-   CRM integration
-   Calendar integration
-   ERP integrations
-   Cloud billing integrations
-   Advanced pricing engines
-   Contract workflows
-   Automated proposal generation
-   Multi-vendor solution composition
-   Procurement workflows
-   Full deal management

------------------------------------------------------------------------

# 41. Recommended Development Order

## Step 1 --- Foundation

Build:

``` text
Next.js
+
Supabase
+
Auth
+
Organizations
+
RLS
```

## Step 2 --- Vendor

Build:

``` text
Vendor onboarding
↓
Website/document upload
↓
Source storage
↓
YOKA ingestion
↓
Solution DNA
```

## Step 3 --- Buyer

Build:

``` text
Buyer onboarding
↓
Requirement input
↓
YOKA discovery
↓
Client Reality Profile
```

## Step 4 --- Matching

Build:

``` text
Client Reality
+
Solution DNA
↓
YOKA matching
↓
Solution Match
```

## Step 5 --- Personalized Solution

Build:

``` text
Solution Model
↓
Pitch presentation
↓
Interactive workspace
```

## Step 6 --- Chat

Build:

``` text
Chat UI
↓
Context retrieval
↓
YOKA
↓
Evidence status
```

## Step 7 --- Capability Frontier

Build:

``` text
Unknown question
↓
Capability Frontier
↓
Vendor dashboard
↓
Human handoff
```

## Step 8 --- Polish

Add:

-   Realtime
-   Animations
-   Better visualization
-   Scenario controls
-   Analytics
-   Demo data
-   Presentation mode

------------------------------------------------------------------------

# 42. Final Architecture

``` text
                         USERS
                    ┌──────┴──────┐
                    │             │
                  VENDOR        BUYER
                    │             │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │   NEXT.JS   │
                    │             │
                    │ Portal UI   │
                    │ Dashboards  │
                    │ Pitch       │
                    │ Workspace   │
                    │ Chat        │
                    └──────┬──────┘
                           │
                    SERVER/API LAYER
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        SUPABASE         YOKA.ai      EXTERNAL
             │          AGENTIC AI      APIs
             │             │
     ┌───────┼───────┐     │
     │       │       │     │
     ▼       ▼       ▼     ▼
 PostgreSQL Storage Auth  Agents
     │
     ▼
APPLICATION SOURCE OF TRUTH
     │
     ├── Organizations
     ├── Vendors
     ├── Buyers
     ├── Vendor Sources
     ├── Vendor Solution DNA
     ├── Client Reality
     ├── Solution Models
     ├── Matches
     ├── Conversations
     ├── Capability Frontier
     └── Audit Trail
```

------------------------------------------------------------------------

# 43. Final Technical Principle

The cleanest way to think about the system is:

> **Next.js builds the experience. Supabase remembers the business.
> YOKA.ai provides the intelligence.**

And the control flow should always be:

``` text
USER
 ↓
NEXT.JS
 ↓
SERVER / APPLICATION LOGIC
 ↓
SUPABASE ← source of truth
 ↓
YOKA.ai ← agentic reasoning
 ↓
SERVER VALIDATION
 ↓
SUPABASE
 ↓
NEXT.JS
 ↓
USER
```

This keeps the architecture simple enough for a hackathon while
preserving a clean path toward a production platform.
