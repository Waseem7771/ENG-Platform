"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { TextReveal } from "@/components/shared/text-reveal";
import { GlowButton } from "@/components/shared/glow-button";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { SpotlightBeam } from "@/components/shared/spotlight-beam";
import { GridBackground } from "@/components/shared/grid-background";
import { FloatingParticles } from "@/components/shared/floating-particles";
import { RotatingText } from "@/components/shared/rotating-text";
import { CountUp } from "@/components/shared/count-up";

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

const features = [
  {
    title: "AI Conversations",
    description: "Practice real scenarios — restaurants, interviews, doctor visits — with an AI that adapts to your level.",
    icon: "💬",
    accent: "from-violet-500/20 to-purple-500/20",
  },
  {
    title: "Live Sessions",
    description: "Learn in real-time with your teacher and classmates. Interactive group sessions, not passive lectures.",
    icon: "👨‍🏫",
    accent: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Games & Puzzles",
    description: "Grammar puzzles, vocabulary matching, word builders, speed quizzes — learn while having fun.",
    icon: "🎮",
    accent: "from-amber-500/20 to-orange-500/20",
  },
  {
    title: "Smart Placement",
    description: "AI-powered placement exam maps your strengths and gaps across grammar, vocabulary, and comprehension.",
    icon: "📝",
    accent: "from-emerald-500/20 to-green-500/20",
  },
  {
    title: "Progress Tracking",
    description: "XP points, streaks, skill breakdowns — see exactly where you stand and how far you've come.",
    icon: "📊",
    accent: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Arabic Speakers",
    description: "Built specifically for Arabic speakers with translation exercises and culturally relevant scenarios.",
    icon: "🌍",
    accent: "from-cyan-500/20 to-blue-500/20",
  },
];

const stats = [
  { label: "Exercise Types", value: 10, suffix: "+" },
  { label: "AI Scenarios", value: 10, suffix: "+" },
  { label: "Skill Categories", value: 6, suffix: "" },
  { label: "CEFR Levels", value: 0, suffix: "", text: "A1–C2" },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.8], [0, -60]);

  return (
    <div className="relative min-h-screen bg-background noise">
      {/* ═══════ NAVBAR ═══════ */}
      <motion.header
        className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-2xl"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Speak<span className="text-violet-400">Path</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-5 py-2 text-sm font-medium text-white/60 transition-colors duration-300 hover:text-white"
            >
              Log in
            </Link>
            <GlowButton href="/signup" variant="primary" className="text-xs">
              Get Started
            </GlowButton>
          </nav>
        </div>
      </motion.header>

      {/* ═══════ HERO SECTION ═══════ */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden pt-24">
        <SpotlightBeam />
        <FloatingParticles count={25} />
        <GridBackground className="absolute inset-0" />

        <motion.div
          className="relative z-10 mx-auto flex min-h-[85vh] max-w-5xl flex-col items-center justify-center px-6 text-center"
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 text-xs uppercase tracking-widest text-violet-300"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
            </span>
            Interactive English Learning
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease }}
          >
            <span className="text-foreground">Your Path to</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Speaking{" "}
              <RotatingText
                words={["English", "Fluently", "Boldly"]}
                interval={2500}
                className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white/40 sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease }}
          >
            AI conversations, live teacher sessions, interactive games —
            designed for Arabic speakers learning English.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
          >
            <GlowButton href="/signup" variant="primary" className="px-10 py-4 text-sm">
              Start Learning Free →
            </GlowButton>
            <GlowButton href="/login" variant="secondary" className="px-10 py-4 text-sm">
              I&apos;m a Teacher
            </GlowButton>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid w-full max-w-lg grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-background/80 p-4 text-center backdrop-blur-sm"
              >
                <div className="text-xl font-bold text-violet-400 sm:text-2xl">
                  {stat.text ? (
                    stat.text
                  ) : (
                    <CountUp end={stat.value} suffix={stat.suffix} duration={2} />
                  )}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <motion.div
            className="flex h-8 w-5 items-start justify-center rounded-full border border-white/15 p-1"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="h-1.5 w-1 rounded-full bg-violet-400"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ FEATURES SECTION ═══════ */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 max-w-2xl">
            <motion.p
              className="mb-4 text-xs uppercase tracking-[0.2em] text-violet-400"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Why SpeakPath
            </motion.p>
            <TextReveal
              text="Everything you need to go from beginner to fluent."
              className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              as="h2"
              staggerDelay={0.02}
            />
          </div>

          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeInUp} custom={i}>
                <SpotlightCard
                  className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-7 transition-colors duration-500 hover:border-white/10 hover:bg-white/[0.04]"
                  spotlightColor="rgba(139, 92, 246, 0.08)"
                >
                  <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${f.accent} p-3 text-2xl`}>
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/40">
                    {f.description}
                  </p>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="relative border-t border-white/5 py-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-20 text-center">
            <motion.p
              className="mb-4 text-xs uppercase tracking-[0.2em] text-cyan-400"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              How It Works
            </motion.p>
            <TextReveal
              text="Three steps to fluency."
              className="text-3xl font-bold tracking-tight sm:text-5xl"
              as="h2"
              staggerDelay={0.025}
            />
          </div>

          <motion.div
            className="space-y-0"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              {
                step: "01",
                title: "Take the Placement Exam",
                desc: "Our AI assesses your grammar, vocabulary, and comprehension to place you at the right level.",
              },
              {
                step: "02",
                title: "Join Live Sessions",
                desc: "Your teacher leads interactive group sessions with exercises, games, and AI conversation practice.",
              },
              {
                step: "03",
                title: "Practice & Level Up",
                desc: "Complete exercises, earn XP, maintain your streak, and watch your skills grow day by day.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                custom={0}
                className="group flex gap-8 border-b border-white/5 py-10 transition-colors duration-500 hover:border-white/10"
              >
                <span className="text-4xl font-bold text-white/10 transition-colors duration-500 group-hover:text-violet-500/50 sm:text-5xl">
                  {item.step}
                </span>
                <div>
                  <h3 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="max-w-md text-sm leading-relaxed text-white/40">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ CTA SECTION ═══════ */}
      <section className="relative overflow-hidden border-t border-white/5 py-32">
        <SpotlightBeam />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease }}
          >
            <TextReveal
              text="Ready to speak with confidence?"
              className="text-3xl font-bold tracking-tight sm:text-5xl"
              as="h2"
              staggerDelay={0.02}
            />
            <p className="mx-auto mt-6 max-w-md text-base text-white/40">
              Join SpeakPath and start your English journey today. No credit
              card, no commitment — just start learning.
            </p>
            <div className="mt-10">
              <GlowButton href="/signup" variant="primary" className="px-12 py-4 text-sm">
                Create Free Account →
              </GlowButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-blue-500 text-[10px] font-bold text-white">
              S
            </div>
            <span className="text-sm text-white/30">
              SpeakPath &copy; 2026
            </span>
          </div>
          <div className="flex gap-6 text-xs text-white/20">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
