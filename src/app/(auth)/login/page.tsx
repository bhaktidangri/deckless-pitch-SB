"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Building2, ShoppingBag, Lock, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"vendor" | "buyer">("buyer");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push(role === "vendor" ? "/vendor" : "/buyer");
    }, 600);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue your solution exploration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2 p-1">
            <RoleTab active={role === "buyer"} onClick={() => setRole("buyer")} icon={ShoppingBag} label="Buyer" />
            <RoleTab active={role === "vendor"} onClick={() => setRole("vendor")} icon={Building2} label="Vendor" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input id="email" type="email" placeholder={role === "vendor" ? "you@cloudnova.io" : "you@meridianretail.com"} defaultValue={role === "vendor" ? "admin@cloudnova.io" : "priya.sharma@meridianretail.com"} className="pl-9" required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input id="password" type="password" placeholder="••••••••" defaultValue="demopassword" className="pl-9" required />
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in as {role === "vendor" ? "Vendor" : "Buyer"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RoleTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all",
        active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
