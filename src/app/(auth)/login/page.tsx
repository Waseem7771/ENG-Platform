"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authClient, signIn } from "@/lib/auth-client";
import { useT } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shared/wordmark";

const ease = [0.35, 0.35, 0, 1] as const;

/**
 * Only allow a same-origin, path-only redirect target. Rejects absolute URLs,
 * protocol-relative (`//`, `/\`) and anything whose resolved origin differs
 * from ours — closing the open-redirect vector.
 */
function safeCallback(raw: string | null): string | null {
  if (!raw || raw[0] !== "/" || /[\\\s]|^\/\//.test(raw)) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || t("common.error"));
      } else {
        const { data } = await authClient.getSession();
        const role = (data?.user as { role?: string } | undefined)?.role;
        const destination = safeCallback(
          new URLSearchParams(window.location.search).get("callbackUrl")
        ) ?? (role === "TEACHER" ? "/teacher" : "/student");
        router.push(destination);
        router.refresh();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease }}
      >
        <div className="rounded-card border-2 border-border bg-card shadow-sticker p-8">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex">
              <Wordmark />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.welcomeBack")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("auth.signInSubtitle")}
            </p>
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

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("auth.password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <div className="text-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("auth.signIn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              href="/signup"
              className="font-medium text-primary transition-colors hover:text-primary"
            >
              {t("auth.signUp")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
