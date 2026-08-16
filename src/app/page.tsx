"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSearch,
  HelpCircle,
  MessageSquareText,
  Radar,
  ShoppingBag,
  Sparkles,
  Users2,
  Workflow,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const flowSteps = [
  { label: "Vendor Solution DNA", icon: Building2 },
  { label: "Buyer Requirement", icon: ShoppingBag },
  { label: "AI Matching", icon: Radar },
  { label: "Personalized Live Solution", icon: Sparkles },
  { label: "Agentic Exploration", icon: MessageSquareText },
  { label: "Human Closure", icon: CheckCircle2 },
];

const vendorProblems = [
  "Preparing customized pitch decks for every prospect",
  "Repetitive discovery calls and requirement gathering",
  "Rebuilding presentations when requirements change",
  "Answering the same technical questions repeatedly",
];

const buyerProblems = [
  "Scheduling meetings before understanding a solution",
  "Sitting through generic, irrelevant presentations",
  "Waiting across multiple meetings for answers",
  "Comparing vendors manually with no personalized view",
];

const features = [
  {
    icon: Building2,
    title: "Vendor Solution DNA",
    desc: "Upload your website, brochures, pricing sheets, and docs. The Vendor Intelligence Agent extracts, classifies, and source-links every capability.",
  },
  {
    icon: Radar,
    title: "Adaptive Buyer Discovery",
    desc: "AI asks only the questions that matter, building a Client Reality Profile from your business context — not a fixed questionnaire.",
  },
  {
    icon: Workflow,
    title: "Solution Matching & Gap Analysis",
    desc: "Buyer requirements are matched against verified vendor capabilities, surfacing strong matches, partial matches, and true gaps.",
  },
  {
    icon: Sparkles,
    title: "Personalized Live Solution",
    desc: "Not twenty generic features — a workspace that explains how the vendor's solution applies specifically to your business, with ROI attached.",
  },
  {
    icon: MessageSquareText,
    title: "Evidence-Grounded Chat",
    desc: "Ask anything. Every answer is labelled verified, modelled, or escalated — the system never invents a capability that isn't proven.",
  },
  {
    icon: FileSearch,
    title: "Capability Frontier",
    desc: "Unresolved questions are tracked, routed to the right vendor expert, and prepared with full buyer context before any human call.",
  },
];

const evidenceStates = [
  {
    tone: "verified" as const,
    title: "VERIFIED",
    desc: "Answer is supported by verified Vendor Solution DNA. The system answers directly, with source references.",
  },
  {
    tone: "modelled" as const,
    title: "MODELLED",
    desc: "Answer can be calculated from buyer data with explicit assumptions — shown alongside the answer.",
  },
  {
    tone: "escalated" as const,
    title: "ESCALATED",
    desc: "No verified evidence exists. The system never invents an answer — it creates a Capability Frontier item instead.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <MarketingNav />
      <Hero />
      <ProblemSection />
      <FlowSection />
      <FeaturesSection />
      <EvidenceSection />
      <CtaSection />
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">Deck-less Pitch</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-medium text-muted transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="text-sm font-medium text-muted transition-colors hover:text-foreground">Platform</a>
          <a href="#evidence" className="text-sm font-medium text-muted transition-colors hover:text-foreground">Evidence &amp; Trust</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden sm:flex" />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--brand-100),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.15),transparent)]" />
      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="brand" className="mx-auto">
            <Zap className="h-3 w-3" /> Vendor Solution DNA → Personalized Buyer Experience
          </Badge>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-balance mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          No deck. A live model of your business, <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">you explore yourself.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-balance mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg"
        >
          Vendors don&apos;t create pitches for buyers. They register their Solution DNA once. Our AI turns
          each buyer&apos;s reality into a personalized, evidence-grounded, continuously updating solution
          experience — bringing humans in only when judgment or closure is required.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href="/vendor" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            <Building2 className="h-4 w-4" /> I&apos;m a Vendor
          </Link>
          <Link href="/buyer" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
            <ShoppingBag className="h-4 w-4" /> I&apos;m a Buyer
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4 text-xs text-subtle"
        >
          Demo environment &middot; dummy data &middot; no account required
        </motion.p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-border bg-surface-2/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The Problem" title="Presales is repetitive on both sides of the table" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <ProblemCard title="Vendors repeat themselves" items={vendorProblems} tone="brand" icon={Building2} />
          <ProblemCard title="Buyers wait for relevance" items={buyerProblems} tone="accent" icon={ShoppingBag} />
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "brand" | "accent";
  icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      <div
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
          tone === "brand" ? "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" : "bg-accent-400/15 text-accent-600 dark:text-accent-400"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function FlowSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How it works" title="One continuous flow, replacing the static pitch" description="From verified vendor knowledge to a personalized, explorable solution — with humans stepping in exactly when judgment is needed." />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {flowSteps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                <step.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              </div>
              <p className="mt-3 text-xs font-medium text-foreground sm:text-sm">{step.label}</p>
              {i !== flowSteps.length - 1 && (
                <ArrowRight className="absolute -right-2 top-5 hidden h-4 w-4 text-subtle lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border bg-surface-2/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Platform" title="Everything both sides need, nothing they don't" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg dark:hover:border-brand-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-950/40 dark:text-brand-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EvidenceSection() {
  return (
    <section id="evidence" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Evidence &amp; Trust"
          title="Three honest outcomes, never a made-up answer"
          description="Answer. Simulate. Escalate. The platform optimizes for the most useful verified answer possible — not for answering every question."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {evidenceStates.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className={cn(
                "rounded-2xl border p-6",
                s.tone === "verified" && "border-verified-border bg-verified-bg",
                s.tone === "modelled" && "border-modelled-border bg-modelled-bg",
                s.tone === "escalated" && "border-escalated-border bg-escalated-bg"
              )}
            >
              <Badge variant={s.tone}>{s.title}</Badge>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-brand-600 to-accent-600 px-6 py-14 sm:px-14"
        >
          <Users2 className="mx-auto h-8 w-8 text-white/80" />
          <h2 className="text-balance mt-4 text-2xl font-bold text-white sm:text-3xl">
            See the flow end to end with CloudNova
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
            Explore the full demo — vendor onboarding, buyer discovery, personalized solution workspace,
            evidence-grounded chat, and the Capability Frontier handoff.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "bg-white text-brand-700 hover:bg-white/90")}>
              Explore buyer solution <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/vendor" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/30 text-white hover:bg-white/10")}>
              View vendor dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Deck-less Pitch</span>
        </div>
        <p className="text-xs text-subtle">Hackathon MVP demo &middot; Next.js + Supabase + YOKA.ai</p>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</p>
      <h2 className="text-balance mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-sm text-muted sm:text-base">{description}</p>}
    </div>
  );
}
