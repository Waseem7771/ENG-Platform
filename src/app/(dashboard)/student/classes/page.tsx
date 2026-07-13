"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/providers/locale-provider";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { bidiIsolate } from "@/lib/i18n-shared";
import type { ClassSummary } from "../_types";

type T = ReturnType<typeof useT>;

const ease = [0.35, 0.35, 0, 1] as const;
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease } } };

interface JoinResponse {
  alreadyJoined: boolean;
  class: { id: string; name: string; level: string; code: string };
}

export default function StudentClassesPage() {
  const t = useT();
  const classes = useApi<ClassSummary[]>(() => api<ClassSummary[]>("/api/classes"), []);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;

    setJoining(true);
    try {
      const res = await api<JoinResponse>("/api/classes/join", {
        method: "POST",
        body: JSON.stringify({ code: trimmed }),
      });
      toast.success(t("classes.joined", { name: bidiIsolate(res.class.name) }));
      setCode("");
      classes.refetch();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("common.error"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">{t("classes.title")}</h1>
      </motion.div>

      <motion.div variants={item}>
        <div className="rounded-card border-2 border-primary/25 bg-secondary p-6 shadow-sticker sm:p-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{t("classes.joinTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("classes.joinBody")}</p>
          <form onSubmit={handleJoin} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={t("classes.codePlaceholder")}
              aria-label={t("classes.joinTitle")}
              maxLength={6}
              disabled={joining}
              className="h-12 flex-1 rounded-xl border-2 border-border bg-card px-4 font-mono text-lg tracking-[0.3em] text-foreground placeholder:tracking-[0.3em] placeholder:text-muted-foreground sm:max-w-xs"
            />
            <Button type="submit" variant="brand" disabled={joining || code.trim().length !== 6} className="shrink-0">
              {joining ? <Loader2 className="size-4 animate-spin" /> : t("classes.join")}
            </Button>
          </form>
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {classes.loading && (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
            ))}
          </>
        )}

        {classes.error && !classes.loading && (
          <div className="rounded-card border-2 border-destructive/20 bg-coral-soft p-8 text-center shadow-sticker">
            <p className="text-foreground">{classes.error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => classes.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        {!classes.loading &&
          !classes.error &&
          classes.data &&
          (classes.data.length === 0 ? (
            <div className="rounded-card border-2 border-border bg-card p-10 text-center shadow-sticker">
              <BookOpen className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">{t("classes.empty")}</p>
            </div>
          ) : (
            classes.data.map((c) => <ClassRow key={c.id} classItem={c} t={t} />)
          ))}
      </motion.div>
    </motion.div>
  );
}

function ClassRow({ classItem, t }: { classItem: ClassSummary; t: T }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border-2 border-border bg-card p-5 shadow-sticker sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold tracking-tight text-foreground">{classItem.name}</p>
          <Badge variant="level">{classItem.level}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("classes.teacherLabel", { name: bidiIsolate(classItem.teacherName) })}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        render={<Link href="/student/sessions" />}
        nativeButton={false}
        role="link"
      >
        {t("classes.viewSessions")}
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}
