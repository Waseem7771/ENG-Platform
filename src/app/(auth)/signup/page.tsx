"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SpotlightBeam } from "@/components/shared/spotlight-beam";
import { GridBackground } from "@/components/shared/grid-background";
import { FloatingParticles } from "@/components/shared/floating-particles";

const ease = [0.35, 0.35, 0, 1] as const;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message || "Failed to create account");
      } else {
        const roleRes = await fetch("/api/auth/set-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        if (!roleRes.ok) {
          // Don't silently drop a Teacher choice down to Student.
          setError("Your account was created but we couldn't set your role. Please sign in and try again.");
          return;
        }
        router.push(role === "TEACHER" ? "/teacher" : "/student");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <SpotlightBeam />
      <FloatingParticles count={15} />
      <GridBackground className="absolute inset-0" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease }}
      >
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                S
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Speak<span className="text-violet-400">Path</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-white/40">Start your English learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-white/50">I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("STUDENT")}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all duration-500 ${
                    role === "STUDENT"
                      ? "border-violet-500/60 bg-violet-500/10 shadow-[inset_0_0_20px_oklch(0.65_0.25_280/0.1)]"
                      : "border-white/5 bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div className="text-2xl mb-1.5">🎓</div>
                  <div className="text-sm font-semibold">Student</div>
                  <div className="text-[10px] text-white/30 mt-0.5">I want to learn</div>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("TEACHER")}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all duration-500 ${
                    role === "TEACHER"
                      ? "border-blue-500/60 bg-blue-500/10 shadow-[inset_0_0_20px_oklch(0.60_0.20_250/0.1)]"
                      : "border-white/5 bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div className="text-2xl mb-1.5">👨‍🏫</div>
                  <div className="text-sm font-semibold">Teacher</div>
                  <div className="text-[10px] text-white/30 mt-0.5">I want to teach</div>
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-wider text-white/50">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-white/50">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-white/50">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/30">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-violet-400 transition-colors hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
