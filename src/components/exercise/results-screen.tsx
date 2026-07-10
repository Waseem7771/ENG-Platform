"use client";

import { motion } from "framer-motion";
import { ScoreRing } from "@/components/shared/score-ring";
import { CountUp } from "@/components/shared/count-up";
import { GlowButton } from "@/components/shared/glow-button";
import type { SubmitResponse } from "@/types";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.35, 0.35, 0, 1] as const } },
};

export function ResultsScreen({
  result,
  title,
  onRetry,
  onBack,
  retryLabel = "Try Again",
  backLabel = "Back to Exercises",
  compact = false,
}: {
  result: SubmitResponse;
  title?: string;
  onRetry?: () => void;
  onBack?: () => void;
  retryLabel?: string;
  backLabel?: string;
  compact?: boolean;
}) {
  const perItem = result.feedback.perItem ? Object.entries(result.feedback.perItem) : [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {title && (
        <motion.p variants={itemVariants} className="text-center text-sm uppercase tracking-widest text-white/40">
          {title}
        </motion.p>
      )}

      <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
        <ScoreRing score={result.score} label="score" size={compact ? 128 : 160} />
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-300">
            +<CountUp end={result.xpEarned} duration={1} /> XP
          </span>
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-semibold text-orange-300">
            🔥 {result.gamification.streak} day streak
          </span>
        </div>
        {result.gamification.levelUp && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full border border-violet-500/40 bg-gradient-to-r from-violet-500/20 to-blue-500/20 px-4 py-1.5 text-sm font-semibold text-white"
          >
            Level up! You&apos;re now {result.gamification.level}
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-sm text-white/70">
        {result.feedback.overall}
      </motion.div>

      {result.aiAvailable === false && (
        <motion.p variants={itemVariants} className="text-center text-xs text-white/30">
          AI offline — basic scoring used.
        </motion.p>
      )}

      {(result.feedback.strengths?.length || result.feedback.improvements?.length) && (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
          {!!result.feedback.strengths?.length && (
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
              <h3 className="mb-3 text-xs uppercase tracking-wider text-emerald-300/70">Strengths</h3>
              <ul className="space-y-1.5 text-sm text-white/70">
                {result.feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!result.feedback.improvements?.length && (
            <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5">
              <h3 className="mb-3 text-xs uppercase tracking-wider text-amber-300/70">Improve</h3>
              <ul className="space-y-1.5 text-sm text-white/70">
                {result.feedback.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {!compact && perItem.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="mb-3 text-xs uppercase tracking-wider text-white/40">Item by item</h3>
          <ul className="space-y-2">
            {perItem.map(([id, fb], i) => (
              <li key={id} className={`rounded-xl border px-4 py-2.5 text-sm ${fb.correct ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-red-500/20 bg-red-500/5 text-red-200"}`}>
                <span className="font-medium">
                  {fb.correct ? "✓" : "✗"} Question {i + 1}
                </span>
                {fb.expected && <span className="ml-2 text-white/40">expected: {fb.expected}</span>}
                {fb.note && <p className="mt-1 text-white/50">{fb.note}</p>}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
        {onRetry && (
          <GlowButton variant="secondary" onClick={onRetry}>
            {retryLabel}
          </GlowButton>
        )}
        {onBack && (
          <GlowButton variant="primary" onClick={onBack}>
            {backLabel}
          </GlowButton>
        )}
      </motion.div>
    </motion.div>
  );
}
