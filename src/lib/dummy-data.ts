import type {
  AuditEvent,
  Buyer,
  Capability,
  CapabilityFrontierItem,
  ClientRealityProfile,
  ConversationMessage,
  GapItem,
  MeetingRequest,
  Requirement,
  RoiProjection,
  SolutionMatch,
  SolutionModel,
  Vendor,
  VendorSource,
} from "./types";

export const vendors: Vendor[] = [
  {
    id: "v-cloudnova",
    name: "CloudNova",
    slug: "cloudnova",
    website: "https://cloudnova.io",
    industry: "Cloud Infrastructure",
    description:
      "CloudNova provides cloud infrastructure, data platform, and security solutions with deep expertise in Kubernetes migration and cost optimization for mid-to-large enterprises.",
    tagline: "Cloud transformation, verified end to end.",
    verificationStatus: "verified",
    employeeRange: "500-1,000",
    hq: "Bengaluru, India",
    foundedYear: 2016,
    color: "brand",
    fitScore: 92,
    keyMatch: "Kubernetes + migration",
    industries: ["BFSI", "Healthcare", "Manufacturing", "Retail"],
  },
  {
    id: "v-northbeam",
    name: "Northbeam Cloud",
    slug: "northbeam",
    website: "https://northbeamcloud.com",
    industry: "Managed Cloud Services",
    description:
      "Northbeam specializes in managed cloud operations and 24/7 infrastructure monitoring for fast-growing companies that need predictable spend.",
    tagline: "Cost-predictable cloud, managed for you.",
    verificationStatus: "verified",
    employeeRange: "100-250",
    hq: "Austin, USA",
    foundedYear: 2019,
    color: "accent",
    fitScore: 78,
    keyMatch: "Cost optimization",
    industries: ["SaaS", "Fintech", "E-commerce"],
  },
  {
    id: "v-aegis",
    name: "Aegis Secure Systems",
    slug: "aegis-secure",
    website: "https://aegissecure.com",
    industry: "Cybersecurity",
    description:
      "Aegis delivers zero-trust security architecture, compliance automation, and managed detection & response for regulated industries.",
    tagline: "Zero-trust security, fully managed.",
    verificationStatus: "verified",
    employeeRange: "250-500",
    hq: "London, UK",
    foundedYear: 2014,
    color: "modelled",
    fitScore: 64,
    keyMatch: "Compliance automation",
    industries: ["BFSI", "Healthcare", "Government"],
  },
  {
    id: "v-vertex",
    name: "Vertex Data Works",
    slug: "vertex-data",
    website: "https://vertexdataworks.com",
    industry: "Data & Analytics",
    description:
      "Vertex builds modern data platforms, ETL pipelines, and analytics infrastructure with a focus on manufacturing and logistics companies.",
    tagline: "Your data, unified and actionable.",
    verificationStatus: "pending",
    employeeRange: "50-100",
    hq: "Singapore",
    foundedYear: 2021,
    color: "verified",
    fitScore: 58,
    keyMatch: "Data modernization",
    industries: ["Manufacturing", "Logistics"],
  },
];

export const primaryVendor = vendors[0];

export const vendorSources: VendorSource[] = [
  {
    id: "src-1",
    vendorId: "v-cloudnova",
    sourceType: "website",
    label: "cloudnova.io",
    detail: "Full site crawl — 42 pages",
    processingStatus: "completed",
    uploadedAt: "2026-08-02T09:14:00Z",
    extractedCount: 28,
  },
  {
    id: "src-2",
    vendorId: "v-cloudnova",
    sourceType: "pdf",
    label: "CloudNova_Product_Brochure_2026.pdf",
    detail: "3.2 MB · 18 pages",
    sizeKb: 3200,
    processingStatus: "completed",
    uploadedAt: "2026-08-02T09:16:00Z",
    extractedCount: 14,
  },
  {
    id: "src-3",
    vendorId: "v-cloudnova",
    sourceType: "pdf",
    label: "CloudNova_Pricing_Sheet_Q3.pdf",
    detail: "640 KB · 4 pages",
    sizeKb: 640,
    processingStatus: "completed",
    uploadedAt: "2026-08-02T09:17:00Z",
    extractedCount: 9,
  },
  {
    id: "src-4",
    vendorId: "v-cloudnova",
    sourceType: "doc",
    label: "Technical_Architecture_Overview.docx",
    detail: "1.1 MB · Kubernetes migration playbook",
    sizeKb: 1100,
    processingStatus: "completed",
    uploadedAt: "2026-08-02T09:20:00Z",
    extractedCount: 11,
  },
  {
    id: "src-5",
    vendorId: "v-cloudnova",
    sourceType: "spreadsheet",
    label: "Case_Studies_Master.xlsx",
    detail: "310 KB · 12 case studies",
    sizeKb: 310,
    processingStatus: "processing",
    uploadedAt: "2026-08-16T08:02:00Z",
  },
  {
    id: "src-6",
    vendorId: "v-cloudnova",
    sourceType: "manual",
    label: "Manually entered FAQs",
    detail: "22 entries added by vendor admin",
    processingStatus: "completed",
    uploadedAt: "2026-08-03T11:00:00Z",
    extractedCount: 22,
  },
];

export const capabilities: Capability[] = [
  {
    id: "cap-1",
    vendorId: "v-cloudnova",
    name: "Kubernetes Migration",
    description:
      "End-to-end migration of monolithic and legacy workloads into containerized, orchestrated Kubernetes environments with minimal service disruption.",
    category: "service",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "Technical_Architecture_Overview.docx", sourceType: "doc", snippet: "Our migration methodology moves workloads in phased waves, validating each service in a staging cluster before cutover." },
      { sourceLabel: "cloudnova.io", sourceType: "website", snippet: "CloudNova has completed 140+ Kubernetes migrations across BFSI, healthcare, and manufacturing clients." },
    ],
    tags: ["kubernetes", "migration", "containers"],
  },
  {
    id: "cap-2",
    vendorId: "v-cloudnova",
    name: "Cloud Cost Optimization",
    description:
      "Continuous rightsizing, reserved-instance planning, and idle-resource elimination to reduce infrastructure spend by 25-40%.",
    category: "service",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "CloudNova_Product_Brochure_2026.pdf", sourceType: "pdf", snippet: "Clients typically see 25-40% cost reduction within the first two billing cycles after optimization rollout." },
    ],
    tags: ["cost", "finops", "optimization"],
  },
  {
    id: "cap-3",
    vendorId: "v-cloudnova",
    name: "Managed Infrastructure",
    description: "24/7 monitoring, patching, and incident response for production cloud environments across AWS, Azure, and GCP.",
    category: "service",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "cloudnova.io", sourceType: "website", snippet: "CloudNova's SRE team provides round-the-clock monitoring with a 15-minute incident response SLA." },
    ],
    tags: ["managed-services", "sre", "monitoring"],
  },
  {
    id: "cap-4",
    vendorId: "v-cloudnova",
    name: "Data Platform Modernization",
    description: "Migration from legacy data warehouses to modern lakehouse architectures with real-time pipelines.",
    category: "product",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "CloudNova_Product_Brochure_2026.pdf", sourceType: "pdf", snippet: "The CloudNova Data Platform supports streaming ingestion and unifies batch + real-time analytics." },
    ],
    tags: ["data", "lakehouse", "analytics"],
  },
  {
    id: "cap-5",
    vendorId: "v-cloudnova",
    name: "Security Platform",
    description: "Identity, network segmentation, and compliance tooling layered across cloud workloads.",
    category: "product",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "cloudnova.io", sourceType: "website", snippet: "CloudNova Security Platform includes SOC2 Type II and ISO 27001 aligned controls out of the box." },
    ],
    tags: ["security", "compliance"],
  },
  {
    id: "cap-6",
    vendorId: "v-cloudnova",
    name: "AWS / Azure / GCP Integration",
    description: "Native integrations and multi-cloud orchestration across all three major hyperscalers.",
    category: "integration",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "Technical_Architecture_Overview.docx", sourceType: "doc", snippet: "Terraform modules are maintained for AWS, Azure, and GCP with parity across core services." },
    ],
    tags: ["aws", "azure", "gcp"],
  },
  {
    id: "cap-7",
    vendorId: "v-cloudnova",
    name: "BFSI & Healthcare Compliance",
    description: "Pre-built compliance frameworks for regulated industries including data residency controls.",
    category: "industry",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "Manually entered FAQs", sourceType: "manual", snippet: "Yes — we maintain dedicated compliance runbooks for BFSI and healthcare clients including RBI and HIPAA-aligned controls." },
    ],
    tags: ["bfsi", "healthcare", "compliance"],
  },
  {
    id: "cap-8",
    vendorId: "v-cloudnova",
    name: "Zero-Downtime Migration Guarantee",
    description: "A contractual guarantee of zero service interruption during migration windows.",
    category: "constraint",
    verificationStatus: "unverified",
    evidence: [],
    tags: ["migration", "sla"],
  },
  {
    id: "cap-9",
    vendorId: "v-cloudnova",
    name: "Enterprise Migration Assessment",
    description: "Large-scale (1000+ node) migrations require a paid technical assessment phase before a fixed-cost quote can be issued.",
    category: "constraint",
    verificationStatus: "verified",
    evidence: [
      { sourceLabel: "CloudNova_Pricing_Sheet_Q3.pdf", sourceType: "pdf", snippet: "Enterprise-scale migrations (1000+ nodes) require a 2-3 week paid assessment engagement prior to fixed pricing." },
    ],
    tags: ["migration", "pricing"],
  },
  {
    id: "cap-10",
    vendorId: "v-cloudnova",
    name: "On-call SLA Response Time under 5 minutes",
    description: "A buyer-specific SLA tighter than CloudNova's published 15-minute standard.",
    category: "constraint",
    verificationStatus: "unverified",
    evidence: [],
    tags: ["sla", "support"],
  },
];

export const buyer: Buyer = {
  id: "b-meridian",
  companyName: "Meridian Retail Group",
  industry: "Retail",
  companySize: 500,
  createdAt: "2026-08-10T10:00:00Z",
  contactName: "Priya Sharma",
  contactRole: "VP of Technology",
};

export const requirements: Requirement[] = [
  { id: "req-1", text: "Reduce annual cloud infrastructure cost", priority: "high", status: "confirmed", source: "buyer_input" },
  { id: "req-2", text: "Migrate legacy monolith to a scalable architecture", priority: "high", status: "confirmed", source: "buyer_input" },
  { id: "req-3", text: "Reduce manual maintenance overhead on infrastructure team", priority: "medium", status: "confirmed", source: "buyer_input" },
  { id: "req-4", text: "Support scaling to 1,000 users within 12 months", priority: "medium", status: "confirmed", source: "ai_inferred" },
  { id: "req-5", text: "Maintain retail compliance (PCI-DSS) throughout migration", priority: "high", status: "confirmed", source: "ai_inferred" },
  { id: "req-6", text: "Zero downtime during the migration window", priority: "high", status: "clarifying", source: "buyer_input" },
];

export const clientRealityProfile: ClientRealityProfile = {
  buyerId: "b-meridian",
  currentTechnology: ["On-prem VMware cluster", "Legacy monolith (Java)", "MySQL 5.7", "Manual deployment scripts"],
  currentCostAnnual: 4200000,
  users: 500,
  processes: ["Manual deployment every release", "Quarterly capacity planning", "On-call rotation via spreadsheet"],
  painPoints: [
    "High infrastructure and maintenance cost",
    "Low server utilization (~28% average)",
    "Scaling requires 6-8 week procurement cycles",
    "Two major outages in the last 6 months during peak sale events",
  ],
  goals: ["Lower total cost of ownership", "Elastic scalability for seasonal peaks", "Reduce maintenance burden on the 4-person infra team"],
  constraints: ["PCI-DSS compliance must be maintained", "Migration cannot disrupt Q4 holiday sale season", "Budget ceiling of ₹35L/year post-migration"],
  timelineMonths: 6,
};

export const gapItems: GapItem[] = [
  {
    id: "gap-1",
    current: "₹42L annual infrastructure cost on underutilized VMware cluster",
    desired: "Elastic, usage-based cloud spend under ₹35L/year",
    gap: "No consumption-based scaling; fixed capacity paid for year-round",
    severity: "high",
  },
  {
    id: "gap-2",
    current: "Manual deployment scripts, 6-8 week hardware procurement",
    desired: "Automated CI/CD with on-demand infrastructure provisioning",
    gap: "No infrastructure-as-code or automated release pipeline",
    severity: "high",
  },
  {
    id: "gap-3",
    current: "28% average server utilization, two peak-season outages",
    desired: "Auto-scaling that absorbs seasonal traffic spikes",
    gap: "Static capacity planning cannot react to real-time demand",
    severity: "medium",
  },
  {
    id: "gap-4",
    current: "4-person infra team manually patching and monitoring servers",
    desired: "Managed monitoring and patching with reduced manual load",
    gap: "No managed operations layer; all operations are manual",
    severity: "medium",
  },
];

export const solutionMatches: SolutionMatch[] = [
  {
    id: "match-1",
    requirementText: "Reduce annual cloud infrastructure cost",
    capabilityId: "cap-2",
    capabilityName: "Cloud Cost Optimization",
    matchStatus: "strong_match",
    confidence: 94,
    reasoning: "CloudNova's optimization service directly targets the 28% utilization gap identified in your current environment, with a verified 25-40% typical reduction range.",
  },
  {
    id: "match-2",
    requirementText: "Migrate legacy monolith to a scalable architecture",
    capabilityId: "cap-1",
    capabilityName: "Kubernetes Migration",
    matchStatus: "strong_match",
    confidence: 91,
    reasoning: "Your Java monolith on VMware is a standard candidate for CloudNova's phased Kubernetes migration methodology, verified across 140+ prior migrations.",
  },
  {
    id: "match-3",
    requirementText: "Reduce manual maintenance overhead on infrastructure team",
    capabilityId: "cap-3",
    capabilityName: "Managed Infrastructure",
    matchStatus: "strong_match",
    confidence: 88,
    reasoning: "24/7 managed monitoring and patching removes the manual burden currently carried by your 4-person infra team.",
  },
  {
    id: "match-4",
    requirementText: "Support scaling to 1,000 users within 12 months",
    capabilityId: "cap-6",
    capabilityName: "AWS / Azure / GCP Integration",
    matchStatus: "partial_match",
    confidence: 76,
    reasoning: "Multi-cloud elasticity supports growth, but exact scaling headroom for your specific workload profile requires a technical assessment to confirm.",
  },
  {
    id: "match-5",
    requirementText: "Maintain retail compliance (PCI-DSS) throughout migration",
    capabilityId: "cap-7",
    capabilityName: "BFSI & Healthcare Compliance",
    matchStatus: "requires_validation",
    confidence: 62,
    reasoning: "CloudNova has verified compliance frameworks for BFSI/healthcare; PCI-DSS-specific controls for retail are not explicitly documented in current sources.",
  },
  {
    id: "match-6",
    requirementText: "Zero downtime during the migration window",
    capabilityId: "cap-8",
    capabilityName: "Zero-Downtime Migration Guarantee",
    matchStatus: "unmatched",
    confidence: 0,
    reasoning: "No verified vendor information confirms a zero-downtime guarantee. This has been sent to the Capability Frontier for vendor confirmation.",
  },
];

export const roiProjection: RoiProjection = {
  currentAnnualCost: 4200000,
  projectedAnnualCost: 2730000,
  savingsPercent: 35,
  paybackMonths: 8,
  threeYearSavings: 4410000,
  chart: [
    { year: "Current", current: 4200000, projected: 4200000 },
    { year: "Year 1", current: 4200000, projected: 2940000 },
    { year: "Year 2", current: 4200000, projected: 2730000 },
    { year: "Year 3", current: 4200000, projected: 2600000 },
  ],
};

export const solutionModel: SolutionModel = {
  id: "sm-1",
  buyerId: "b-meridian",
  vendorId: "v-cloudnova",
  version: 3,
  status: "active",
  executiveSummary:
    "Meridian Retail Group is spending ₹42L annually on an underutilized on-prem VMware cluster running a legacy Java monolith. CloudNova's verified Kubernetes migration and cost optimization capabilities directly address the two highest-priority gaps — infrastructure cost and scalability — with a projected 35% cost reduction and an 8-month payback period. One requirement, zero-downtime migration, is not yet verified against CloudNova's Solution DNA and has been escalated for vendor confirmation.",
  matches: solutionMatches,
  gaps: gapItems,
  roi: roiProjection,
  updatedAt: "2026-08-16T07:40:00Z",
};

export const capabilityFrontierItems: CapabilityFrontierItem[] = [
  {
    id: "cf-1",
    buyerId: "b-meridian",
    buyerName: "Meridian Retail Group",
    vendorId: "v-cloudnova",
    vendorName: "CloudNova",
    question: "Can your platform migrate our legacy system with zero downtime?",
    requirement: "Zero-downtime migration",
    context: "Legacy Java monolith on VMware, PCI-DSS retail environment, cannot disrupt Q4 holiday sale season.",
    evidenceChecked: ["Technical_Architecture_Overview.docx", "cloudnova.io migration pages", "CloudNova_Product_Brochure_2026.pdf"],
    reasonUnresolved: "No verified vendor information guarantees zero downtime; migration docs describe phased cutover with brief maintenance windows.",
    status: "open",
    recommendedExpert: "Solutions Architect",
    createdAt: "2026-08-15T14:22:00Z",
  },
  {
    id: "cf-2",
    buyerId: "b-meridian",
    buyerName: "Meridian Retail Group",
    vendorId: "v-cloudnova",
    vendorName: "CloudNova",
    question: "Do you have PCI-DSS specific compliance controls for retail payment systems?",
    requirement: "PCI-DSS compliance validation",
    context: "Retail payment processing environment handling card-present and card-not-present transactions.",
    evidenceChecked: ["Manually entered FAQs", "CloudNova Security Platform docs"],
    reasonUnresolved: "Compliance frameworks are documented for BFSI and healthcare (RBI, HIPAA) but PCI-DSS is not explicitly named in current sources.",
    status: "vendor_review",
    recommendedExpert: "Compliance Specialist",
    createdAt: "2026-08-14T09:10:00Z",
    vendorResponse: "Confirming with our compliance team — PCI-DSS Level 1 controls are supported, documentation update in progress.",
  },
  {
    id: "cf-3",
    buyerId: "b-meridian",
    buyerName: "Meridian Retail Group",
    vendorId: "v-cloudnova",
    vendorName: "CloudNova",
    question: "Can you commit to a sub-5-minute incident response SLA instead of the standard 15 minutes?",
    requirement: "Tighter on-call SLA",
    context: "Buyer experienced two outages during peak sale events last year and wants faster incident response.",
    evidenceChecked: ["cloudnova.io", "CloudNova_Pricing_Sheet_Q3.pdf"],
    reasonUnresolved: "Published SLA is 15 minutes; a tighter custom SLA is a commercial negotiation point outside verified Solution DNA.",
    status: "resolved",
    recommendedExpert: "Account Executive",
    createdAt: "2026-08-12T16:45:00Z",
    vendorResponse: "We can offer a 5-minute SLA as part of the Enterprise support tier at an additional cost — details shared with buyer.",
  },
];

export const conversation: ConversationMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "Hi Priya — I'm the CloudNova solution assistant for Meridian Retail Group. I can answer questions about your personalized solution, pricing, migration approach, or ROI. What would you like to explore?",
    createdAt: "2026-08-16T07:00:00Z",
  },
  {
    id: "msg-2",
    role: "user",
    content: "How much can we realistically save in the first year?",
    createdAt: "2026-08-16T07:01:00Z",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "Based on your current ₹42L annual infrastructure cost and CloudNova's verified 25-40% optimization range, your Year 1 projection is approximately ₹29.4L — a saving of roughly ₹12.6L (30%). This ramps to ~35% by Year 2 as workloads fully migrate.",
    responseStatus: "modelled",
    assumptions: ["Assumes phased migration completes within 6 months", "Assumes current 28% utilization baseline holds until cutover"],
    evidence: [{ sourceLabel: "CloudNova_Product_Brochure_2026.pdf", sourceType: "pdf", snippet: "Clients typically see 25-40% cost reduction within the first two billing cycles after optimization rollout." }],
    createdAt: "2026-08-16T07:01:20Z",
  },
  {
    id: "msg-4",
    role: "user",
    content: "What happens if our users increase to 1,000 next year?",
    createdAt: "2026-08-16T07:03:00Z",
  },
  {
    id: "msg-5",
    role: "assistant",
    content:
      "At 1,000 users, projected infrastructure cost rises to approximately ₹34.8L/year — still 17% below your current ₹42L baseline — because Kubernetes auto-scaling only provisions the additional capacity you actually use, unlike your current fixed-capacity model.",
    responseStatus: "modelled",
    assumptions: ["Linear scaling assumption on compute; storage/network costs may vary", "Based on your current workload mix remaining stable"],
    createdAt: "2026-08-16T07:03:25Z",
  },
  {
    id: "msg-6",
    role: "user",
    content: "Can you guarantee zero downtime during migration?",
    createdAt: "2026-08-16T07:05:00Z",
  },
  {
    id: "msg-7",
    role: "assistant",
    content:
      "This specific requirement isn't verified in CloudNova's available information — their documentation describes phased cutover with brief maintenance windows, but no explicit zero-downtime guarantee is on record. I've flagged this for a CloudNova Solutions Architect to confirm directly rather than assume an answer.",
    responseStatus: "escalated",
    evidence: [
      { sourceLabel: "Technical_Architecture_Overview.docx", sourceType: "doc", snippet: "Our migration methodology moves workloads in phased waves, validating each service in a staging cluster before cutover." },
    ],
    createdAt: "2026-08-16T07:05:15Z",
  },
];

export const auditEvents: AuditEvent[] = [
  { id: "ae-1", agentName: "Vendor Intelligence Agent", action: "Extracted capability", entityType: "Capability", entityName: "Kubernetes Migration", confidence: "verified", humanVerified: true, timestamp: "2026-08-02T09:18:00Z" },
  { id: "ae-2", agentName: "Vendor Intelligence Agent", action: "Extracted capability", entityType: "Capability", entityName: "Cloud Cost Optimization", confidence: "verified", humanVerified: true, timestamp: "2026-08-02T09:19:00Z" },
  { id: "ae-3", agentName: "Buyer Discovery Agent", action: "Captured requirement", entityType: "Requirement", entityName: "Reduce annual cloud infrastructure cost", confidence: "verified", humanVerified: false, timestamp: "2026-08-10T10:12:00Z" },
  { id: "ae-4", agentName: "Solution Matching Agent", action: "Generated match", entityType: "Solution Match", entityName: "Cloud Cost Optimization → Cost requirement", confidence: "verified", humanVerified: false, timestamp: "2026-08-11T08:30:00Z" },
  { id: "ae-5", agentName: "Solution Model Agent", action: "Calculated ROI projection", entityType: "Solution Model", entityName: "Meridian Retail Group v3", confidence: "modelled", humanVerified: false, timestamp: "2026-08-16T07:01:20Z" },
  { id: "ae-6", agentName: "Grounding & Escalation Agent", action: "Created Capability Frontier item", entityType: "Capability Frontier", entityName: "Zero-downtime migration", confidence: "escalated", humanVerified: false, timestamp: "2026-08-15T14:22:00Z" },
  { id: "ae-7", agentName: "Grounding & Escalation Agent", action: "Notified vendor", entityType: "Notification", entityName: "CloudNova Solutions Team", confidence: "escalated", humanVerified: false, timestamp: "2026-08-15T14:23:00Z" },
];

export const meetingRequests: MeetingRequest[] = [
  { id: "mr-1", buyerName: "Meridian Retail Group", vendorName: "CloudNova", status: "requested", unresolvedCount: 2, expert: "Solutions Architect" },
  { id: "mr-2", buyerName: "Kestrel Logistics", vendorName: "CloudNova", status: "scheduled", unresolvedCount: 1, proposedDate: "2026-08-20T15:00:00Z", expert: "Solutions Architect" },
  { id: "mr-3", buyerName: "Solace Health Systems", vendorName: "CloudNova", status: "completed", unresolvedCount: 0, expert: "Account Executive" },
];

export const otherBuyerEngagements = [
  { id: "eng-2", buyerName: "Kestrel Logistics", industry: "Logistics", stage: "Solution Review", lastActive: "2026-08-15T12:00:00Z", frontierOpen: 1, fitScore: 81 },
  { id: "eng-3", buyerName: "Solace Health Systems", industry: "Healthcare", stage: "Closed - Won", lastActive: "2026-08-09T09:30:00Z", frontierOpen: 0, fitScore: 88 },
  { id: "eng-4", buyerName: "Fintrust Bank", industry: "BFSI", stage: "Discovery", lastActive: "2026-08-16T06:20:00Z", frontierOpen: 0, fitScore: 74 },
  { id: "eng-5", buyerName: "Prairie Foods Co.", industry: "Manufacturing", stage: "Vendor Selection", lastActive: "2026-08-13T10:00:00Z", frontierOpen: 0, fitScore: 69 },
];

export const engagements = [
  { id: buyer.id, buyerName: buyer.companyName, industry: buyer.industry, stage: "Solution Workspace", fitScore: 92, frontierOpen: 2, lastActive: "2026-08-16T07:40:00Z" },
  ...otherBuyerEngagements,
];

export const platformActivity = [
  { week: "Wk 1", solutions: 12, questions: 34 },
  { week: "Wk 2", solutions: 18, questions: 51 },
  { week: "Wk 3", solutions: 22, questions: 63 },
  { week: "Wk 4", solutions: 19, questions: 58 },
  { week: "Wk 5", solutions: 27, questions: 74 },
  { week: "Wk 6", solutions: 34, questions: 89 },
];

export const recentOrganizations = [
  { id: "org-1", name: "CloudNova", type: "vendor" as const, joinedAt: "2026-08-02T09:00:00Z", status: "verified" as const },
  { id: "org-2", name: "Meridian Retail Group", type: "buyer" as const, joinedAt: "2026-08-10T10:00:00Z", status: "verified" as const },
  { id: "org-3", name: "Northbeam Cloud", type: "vendor" as const, joinedAt: "2026-08-11T14:20:00Z", status: "verified" as const },
  { id: "org-4", name: "Fintrust Bank", type: "buyer" as const, joinedAt: "2026-08-16T06:00:00Z", status: "pending" as const },
  { id: "org-5", name: "Vertex Data Works", type: "vendor" as const, joinedAt: "2026-08-14T11:00:00Z", status: "pending" as const },
];

export const dashboardStats = {
  vendor: {
    activeBuyers: 12,
    solutionsGenerated: 34,
    openFrontierItems: 5,
    avgFitScore: 79,
    presalesHoursSaved: 146,
  },
  buyer: {
    questionsResolved: 18,
    vendorsExplored: 4,
    solutionReadiness: 82,
    openQuestions: 2,
  },
  admin: {
    totalOrganizations: 47,
    activeVendors: 19,
    activeBuyers: 28,
    totalSolutionModels: 112,
    groundedAnswerRate: 94,
  },
};
