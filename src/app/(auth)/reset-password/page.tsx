"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { resetPassword } from "@/lib/auth-client";
import { useT } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ease = [0.35, 0.35, 0, 1] as const;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const token = searchParams.get("token") ?? "";
  const linkError = searchParams.get("error");
  const isInvalidLink = Boolean(linkError) || !token;
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await resetPassword({ newPassword, token });
      if (result.error) {
        setError(result.error.message ?? t("common.error"));
      } else {
        toast.success(t("auth.passwordUpdated"));
        router.push("/login");
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
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-violet-500/20">
                S
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Speak<span className="text-primary">Path</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetPassword")}</h1>
          </div>

          {isInvalidLink ? (
            <>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {t("auth.resetLinkInvalid")}
              </div>
              <Button
                render={<Link href="/forgot-password" />}
                nativeButton={false}
                className="mt-5 w-full"
              >
                {t("auth.requestNewLink")}
              </Button>
            </>
          ) : (
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
                <Label htmlFor="newPassword" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("auth.newPassword")}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  minLength={8}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? t("common.loading") : t("auth.resetPassword")}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary transition-colors hover:text-primary">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
