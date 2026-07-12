"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, GraduationCap, LogIn, Presentation, UserPlus } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";

const ease = [0.35, 0.35, 0, 1] as const;

interface MeLite {
  user: { id: string; name: string; role: UserRole };
}

interface JoinResponse {
  alreadyJoined: boolean;
  class: { id: string; name: string; level: string; code: string };
}

function JoinForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();

  const me = useApi<MeLite>(() => api<MeLite>("/api/me"), []);
  const [joining, setJoining] = useState(false);

  // /api/me 401s for a signed-out visitor — that's the expected, common case
  // here (this page is public), so any fetch error is treated as "not
  // authenticated" rather than shown as a scary error banner.
  const authed = !me.loading && !me.error && Boolean(me.data);
  const role = me.data?.user.role;

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/join?code=${code}`)}`;

  async function handleJoin() {
    if (!code) return;
    setJoining(true);
    try {
      const res = await api<JoinResponse>("/api/classes/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      toast.success(
        res.alreadyJoined
          ? t("join.alreadyJoined", { name: res.class.name })
          : t("join.joined", { name: res.class.name })
      );
      router.push("/student/classes");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("common.error"));
      setJoining(false);
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
        <div className="rounded-card border-2 border-border bg-card shadow-sticker p-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-violet-500/20">
              S
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Speak<span className="text-primary">Path</span>
            </span>
          </Link>

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <GraduationCap className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">{t("join.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("join.subtitle")}</p>

          {code && (
            <div
              dir="ltr"
              className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-sm tracking-[0.2em] text-primary"
            >
              {code}
            </div>
          )}

          <div className="mt-7">
            {me.loading ? (
              <div className="h-11 animate-pulse rounded-btn bg-muted" />
            ) : !code ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("join.noCode")}</p>
                <Button render={<Link href="/student/classes" />} nativeButton={false} role="link" className="w-full">
                  {t("join.enterCodeManually")}
                </Button>
              </div>
            ) : !authed ? (
              <div className="space-y-3">
                <Button
                  render={<Link href="/signup?role=student" />}
                  nativeButton={false}
                  role="link"
                  className="w-full gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("join.signUpCta")}
                </Button>
                <Button
                  render={<Link href={loginHref} />}
                  nativeButton={false}
                  role="link"
                  variant="ghost"
                  className="w-full gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  {t("join.logInCta")}
                </Button>
              </div>
            ) : role === "TEACHER" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                <Presentation className="h-4 w-4 shrink-0" />
                {t("join.teacherNotice")}
              </div>
            ) : (
              <Button onClick={handleJoin} disabled={joining} className="w-full gap-2">
                {joining ? (
                  t("common.loading")
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("join.joinNow")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}
