"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  Flame,
  Gamepad2,
  Globe,
  Lock,
  MessageCircle,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import { Wordmark } from "@/components/shared/wordmark";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button } from "@/components/ui/button";

const ease = [0.35, 0.35, 0, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.8, ease },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

// Feature copy comes from `marketing.feature{Key}{Title,Desc}`; icons are lucide
// (no emoji), rendered in a uniform `bg-secondary text-primary` tile (no gradient
// accents, no leaf/coral decoration — spec §3.1/§3.3).
const features: { key: string; Icon: LucideIcon }[] = [
  { key: "Conv", Icon: MessageCircle },
  { key: "Live", Icon: Users },
  { key: "Games", Icon: Gamepad2 },
  { key: "Placement", Icon: ClipboardList },
  { key: "Progress", Icon: BarChart3 },
  { key: "Arabic", Icon: Globe },
];

// The four honest numeric facts; labels come from `marketing.stat*`. Values are
// wrapped in `dir="ltr"` so level codes / "10+" keep their order under RTL.
const stats: { key: string; value: string }[] = [
  { key: "statExerciseTypes", value: "10+" },
  { key: "statScenarios", value: "10+" },
  { key: "statSkills", value: "6" },
  { key: "statLevels", value: "A1–C2" },
];

const steps: { n: string; key: string }[] = [
  { n: "01", key: "step1" },
  { n: "02", key: "step2" },
  { n: "03", key: "step3" },
];

export default function LandingPage() {
  const t = useT();

  return (
    // `reducedMotion="user"` gates every entrance transform behind
    // prefers-reduced-motion (framer-motion keeps opacity, drops movement).
    // Nothing loops ambiently — the infinite ping + scroll indicator are gone.
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-background">
        {/* ═══════ NAVBAR ═══════ */}
        <motion.header
          className="fixed top-0 z-50 w-full border-b border-border bg-background/60"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Wordmark size="md" />
            <nav className="flex items-center gap-2 sm:gap-3">
              <LanguageToggle />
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                {t("marketing.navLogin")}
              </Link>
              <Button render={<Link href="/signup" />} nativeButton={false} role="link" size="sm">
                {t("marketing.navGetStarted")}
              </Button>
            </nav>
          </div>
        </motion.header>

        {/* ═══════ HERO SECTION ═══════ */}
        <section className="relative min-h-screen overflow-hidden pt-24">
          <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-5xl flex-col items-center justify-center px-6 text-center">
            {/* Badge — static token dot, no infinite ping */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-secondary px-4 py-1.5 text-xs uppercase tracking-widest text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {t("marketing.heroBadge")}
            </motion.div>

            {/* Main heading — two lines: lead (foreground) + emph (primary) */}
            <motion.h1
              className="text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease }}
            >
              <span className="text-foreground">{t("marketing.heroTitleLead")}</span>
              <br />
              <span className="text-primary">{t("marketing.heroTitleEmph")}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease }}
            >
              {t("marketing.heroSubtitle")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease }}
            >
              <Button render={<Link href="/signup" />} nativeButton={false} role="link" size="lg">
                {t("marketing.ctaStart")}
                <ArrowRight className="rtl:-scale-x-100" />
              </Button>
              <Button
                render={<Link href="/signup?role=teacher" />}
                nativeButton={false}
                role="link"
                variant="ghost"
                size="lg"
              >
                {t("marketing.ctaTeacher")}
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="mt-20 grid w-full max-w-lg grid-cols-4 gap-px overflow-hidden rounded-card border border-border bg-muted"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease }}
            >
              {stats.map((stat) => (
                <div key={stat.key} className="bg-background p-4 text-center">
                  <div className="text-xl font-bold text-primary sm:text-2xl">
                    <span dir="ltr">{stat.value}</span>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t(`marketing.${stat.key}`)}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ FEATURES SECTION ═══════ */}
        <section className="relative py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-20 max-w-2xl">
              <motion.p
                className="mb-4 text-xs uppercase tracking-[0.2em] text-primary"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {t("marketing.whyEyebrow")}
              </motion.p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {t("marketing.whyTitle")}
              </h2>
            </div>

            <motion.div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {features.map(({ key, Icon }, i) => (
                <motion.div key={key} variants={fadeInUp} custom={i}>
                  <div className="h-full rounded-card border-2 border-border bg-card p-7 shadow-sticker">
                    <div className="mb-5 inline-flex rounded-xl bg-secondary p-3 text-primary">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight">
                      {t(`marketing.feature${key}Title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`marketing.feature${key}Desc`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ PRODUCT PREVIEW ═══════ */}
        {/* Honest preview: a browser-frame mock built entirely from real tokens
            (sticker panel + faux top bar + a static Path with real lesson nodes
            and a bg-primary "continue" track). No external image, no particle
            hero — the real design, mirrored RTL-safe. */}
        <section className="relative border-t border-border py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-14 text-center">
              <motion.p
                className="mb-4 text-xs uppercase tracking-[0.2em] text-primary"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {t("marketing.previewEyebrow")}
              </motion.p>
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t("marketing.previewTitle")}
              </h2>
            </div>

            <motion.div
              className="mx-auto max-w-2xl overflow-hidden rounded-card border-2 border-border bg-card shadow-sticker"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease }}
              aria-hidden="true"
            >
              {/* Faux browser top bar — three dots via logical flex layout */}
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                <span className="size-3 rounded-full bg-muted" />
                <span className="size-3 rounded-full bg-muted" />
                <span className="size-3 rounded-full bg-muted" />
              </div>

              {/* Body — a small static Path from the real tokens */}
              <div className="space-y-6 bg-background p-6 sm:p-8">
                {/* Header row: greeting placeholder + streak/xp badges */}
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-32 rounded-full bg-muted" />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-sun/50 bg-sun-soft px-2.5 text-accent-foreground">
                      <Flame className="size-3" />
                      <span className="h-1.5 w-3 rounded-full bg-accent-foreground/40" />
                    </span>
                    <span className="inline-flex h-6 items-center rounded-full border border-primary/25 bg-secondary px-2.5">
                      <span className="h-1.5 w-7 rounded-full bg-secondary-foreground/40" />
                    </span>
                  </div>
                </div>

                {/* Continue card — the real bg-primary "next up" track */}
                <div className="rounded-card bg-primary p-5 text-primary-foreground shadow-press-brand">
                  <div className="h-2 w-16 rounded-full bg-primary-foreground/40" />
                  <div className="mt-3 h-3 w-40 rounded-full bg-primary-foreground/70" />
                  <div className="mt-2 h-2.5 w-28 rounded-full bg-primary-foreground/40" />
                  <div className="mt-4 h-8 w-28 rounded-btn bg-sun" />
                </div>

                {/* Unit card — real lesson nodes + connector track */}
                <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
                  <div className="mb-5 h-4 w-20 rounded-full bg-muted" />
                  <PreviewLesson node="done" isFirst />
                  <PreviewLesson node="done" connector="done" />
                  <PreviewLesson node="current" connector="done" />
                  <PreviewLesson node="locked" connector="todo" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="relative border-t border-border py-32">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-20 text-center">
              <motion.p
                className="mb-4 text-xs uppercase tracking-[0.2em] text-primary"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {t("marketing.howEyebrow")}
              </motion.p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {t("marketing.howTitle")}
              </h2>
            </div>

            <motion.div
              className="space-y-0"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {steps.map(({ n, key }) => (
                <motion.div
                  key={n}
                  variants={fadeInUp}
                  custom={0}
                  className="group flex gap-8 border-b border-border py-10"
                >
                  <span className="text-4xl font-bold text-muted-foreground transition-colors duration-500 group-hover:text-primary/50 sm:text-5xl">
                    <span dir="ltr">{n}</span>
                  </span>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">
                      {t(`marketing.${key}Title`)}
                    </h3>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      {t(`marketing.${key}Desc`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="relative overflow-hidden border-t border-border py-32">
          <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease }}
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {t("marketing.finalTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-md text-base text-muted-foreground">
                {t("marketing.finalSubtitle")}
              </p>
              <div className="mt-10">
                <Button render={<Link href="/signup" />} nativeButton={false} role="link" size="lg">
                  {t("marketing.finalCta")}
                  <ArrowRight className="rtl:-scale-x-100" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-border py-10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3">
              <Wordmark size="sm" />
              <span className="text-sm text-muted-foreground">{t("marketing.footerRights")}</span>
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span>{t("marketing.footerPrivacy")}</span>
              <span>{t("marketing.footerTerms")}</span>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

// A single static lesson row for the preview, mirroring the real Path node
// treatment (done = primary + Check, current = outlined primary + Star,
// locked = muted + Lock) and the connector track (bg-primary/50 when the
// previous lesson is done, bg-border otherwise). Text is represented by a
// skeleton bar so the preview stays copy-free and locale-agnostic.
function PreviewLesson({
  node,
  isFirst = false,
  connector,
}: {
  node: "done" | "current" | "locked";
  isFirst?: boolean;
  connector?: "done" | "todo";
}) {
  const nodeClass =
    node === "done"
      ? "bg-primary text-primary-foreground"
      : node === "current"
        ? "border-2 border-primary bg-card text-primary"
        : "bg-muted text-muted-foreground";
  const Icon = node === "done" ? Check : node === "current" ? Star : Lock;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        {!isFirst && (
          <div
            className={`h-5 w-1 rounded-full ${connector === "done" ? "bg-primary/50" : "bg-border"}`}
          />
        )}
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${nodeClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="flex-1 pb-6">
        <div className="h-3.5 w-40 rounded-full bg-muted" />
        <div className="mt-2 h-2.5 w-24 rounded-full bg-muted/70" />
      </div>
    </div>
  );
}
