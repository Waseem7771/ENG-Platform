"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Presentation } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease }}
      >
        <div className="rounded-card border-2 border-border bg-card shadow-sticker p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-violet-500/20">
                S
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Speak<span className="text-primary">Path</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Start your English learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("STUDENT")}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all duration-500 ${
                    role === "STUDENT"
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-line-strong bg-card"
                  }`}
                >
                  <GraduationCap className="mx-auto mb-1.5 h-6 w-6" />
                  <div className="text-sm font-semibold">Student</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">I want to learn</div>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("TEACHER")}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all duration-500 ${
                    role === "TEACHER"
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-line-strong bg-card"
                  }`}
                >
                  <Presentation className="mx-auto mb-1.5 h-6 w-6" />
                  <div className="text-sm font-semibold">Teacher</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">I want to teach</div>
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary transition-colors hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
