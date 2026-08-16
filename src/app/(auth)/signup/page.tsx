"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Check, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "vendor" | "buyer";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push(role === "vendor" ? "/vendor/onboarding" : "/buyer/discover");
    }, 700);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-lg">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Step number={1} label="Role" active={step === 1} done={step > 1} />
            <div className="h-px flex-1 bg-border" />
            <Step number={2} label="Details" active={step === 2} done={false} />
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            {step === 1 ? "Tell us which side of the platform you're joining." : `Set up your ${role} workspace.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <RoleCard
                  icon={Building2}
                  title="I'm a Vendor"
                  desc="Register your solution capabilities and reach qualified buyers."
                  active={role === "vendor"}
                  onClick={() => setRole("vendor")}
                />
                <RoleCard
                  icon={ShoppingBag}
                  title="I'm a Buyer"
                  desc="Describe your requirement and get a personalized solution."
                  active={role === "buyer"}
                  onClick={() => setRole("buyer")}
                />
                <Button
                  type="button"
                  disabled={!role}
                  onClick={() => setStep(2)}
                  className="col-span-full mt-2"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="company">Company name</Label>
                  <Input id="company" placeholder={role === "vendor" ? "CloudNova" : "Meridian Retail Group"} required />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="https://yourcompany.com" required />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select id="industry" defaultValue="">
                    <option value="" disabled>Select industry</option>
                    <option>Cloud Infrastructure</option>
                    <option>Retail</option>
                    <option>Manufacturing</option>
                    <option>BFSI</option>
                    <option>Healthcare</option>
                    <option>SaaS</option>
                    <option>Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="work-email">Work email</Label>
                  <Input id="work-email" type="email" placeholder="you@company.com" required />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1" loading={loading}>
                    Create {role} workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RoleCard({ icon: Icon, title, desc, active, onClick }: { icon: React.ElementType; title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/30" : "border-border bg-surface hover:border-border-strong"
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-surface-2 text-muted")}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
    </button>
  );
}

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
          done ? "bg-brand-600 text-white" : active ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "bg-surface-2 text-subtle"
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span className={cn("text-xs font-medium", active || done ? "text-foreground" : "text-subtle")}>{label}</span>
    </div>
  );
}
