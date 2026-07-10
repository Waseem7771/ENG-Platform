"use client";

import { motion } from "framer-motion";

export function FeedbackBanner({ correct, explanation }: { correct: boolean; explanation?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={correct ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 text-sm ${
        correct
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_25px_-5px_rgba(16,185,129,0.4)]"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      <p className="font-semibold">{correct ? "Correct!" : "Not quite"}</p>
      {explanation && <p className="mt-1 text-white/60">{explanation}</p>}
    </motion.div>
  );
}
