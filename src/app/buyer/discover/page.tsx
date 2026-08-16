"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Turn {
  question: string;
  placeholder: string;
  defaultAnswer: string;
}

const script: Turn[] = [
  {
    question: "What's the primary problem or requirement you're facing?",
    placeholder: "Describe your business problem...",
    defaultAnswer: "We need to reduce our cloud infrastructure cost and our current setup is hard to scale.",
  },
  {
    question: "What systems or infrastructure are you currently using?",
    placeholder: "e.g. On-prem servers, specific vendors, database...",
    defaultAnswer: "On-prem VMware cluster running a legacy Java monolith, MySQL 5.7.",
  },
  {
    question: "Roughly what's your current annual infrastructure cost?",
    placeholder: "e.g. ₹40L per year",
    defaultAnswer: "About ₹42 lakhs per year.",
  },
  {
    question: "How many users or how much load does this support today?",
    placeholder: "e.g. 500 users",
    defaultAnswer: "Around 500 users, growing toward 1,000 next year.",
  },
  {
    question: "What's your expected timeline, and are there any windows we should avoid?",
    placeholder: "e.g. 6 months, avoid Q4",
    defaultAnswer: "About 6 months — but we can't disrupt our Q4 holiday sale season.",
  },
  {
    question: "Any compliance or regulatory requirements we should know about?",
    placeholder: "e.g. PCI-DSS, HIPAA, SOC2...",
    defaultAnswer: "Yes — PCI-DSS, since we process retail card payments.",
  },
];

interface CompletedTurn extends Turn {
  answer: string;
}

export default function DiscoverPage() {
  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [input, setInput] = useState(script[0].defaultAnswer);
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentIndex = completed.length;
  const current = script[currentIndex];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [completed, thinking]);

  function submit() {
    if (!current || !input.trim()) return;
    const answer = input.trim();
    setThinking(true);
    setTimeout(() => {
      setCompleted((c) => [...c, { ...current, answer }]);
      setThinking(false);
      const next = script[currentIndex + 1];
      setInput(next ? next.defaultAnswer : "");
      if (!next) setDone(true);
    }, 850);
  }

  const progress = Math.round((completed.length / script.length) * 100);

  return (
    <div>
      <div className="mb-6">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Buyer Discovery Agent</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tell us about your business</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">
          The AI asks only what&apos;s relevant to your problem — no fixed questionnaire. Answers build your Client
          Reality Profile in real time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex h-[600px] flex-col lg:col-span-2">
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
            {completed.map((turn, i) => (
              <div key={i} className="space-y-4">
                <QuestionBubble text={turn.question} />
                <AnswerBubble text={turn.answer} />
              </div>
            ))}

            {!done && current && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <QuestionBubble text={current.question} />
                {thinking && <ThinkingBubble />}
              </motion.div>
            )}

            {done && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                <Avatar name="Discovery AI" color="brand" size="sm" />
                <div className="rounded-2xl rounded-tl-sm border border-verified-border bg-verified-bg px-4 py-3 text-sm text-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-verified">
                    <CheckCircle2 className="h-4 w-4" /> That&apos;s everything I need for now.
                  </p>
                  <p className="mt-1 text-foreground/80">
                    I&apos;ve built your Client Reality Profile and matched it against verified vendor capabilities.
                    CloudNova looks like a strong fit based on your requirements.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {!done && (
            <div className="border-t border-border p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={current?.placeholder}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button type="submit" disabled={!input.trim() || thinking}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}

          {done && (
            <div className="border-t border-border p-4">
              <Link href="/buyer/vendors" className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
                See vendor recommendations <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Progress
              </CardTitle>
              <CardDescription>{completed.length} of {script.length} questions answered</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Reality Profile</CardTitle>
              <CardDescription>Building live as you answer</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <AnimatePresence>
                {completed.length === 0 && <p className="text-sm text-subtle">Nothing captured yet.</p>}
                <div className="space-y-3">
                  {completed.map((turn, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-lg bg-surface-2 p-3"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{turn.question}</p>
                      <p className="mt-1 text-sm text-foreground">{turn.answer}</p>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuestionBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name="Discovery AI" color="brand" size="sm" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-4 py-3 text-sm text-foreground">
        {text}
      </div>
    </div>
  );
}

function AnswerBubble({ text }: { text: string }) {
  return (
    <div className="flex flex-row-reverse items-start gap-3">
      <Avatar name="You" color="accent" size="sm" />
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm text-white">{text}</div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-1.5 pl-11">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-subtle"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
