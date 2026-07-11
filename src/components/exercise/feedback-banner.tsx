"use client";

import { motion } from "framer-motion";

export function FeedbackBanner({ correct, explanation }: { correct: boolean; explanation?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={correct ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 text-sm ${
        correct ? "border-leaf bg-leaf-soft text-leaf-text" : "border-destructive bg-coral-soft text-destructive"
      }`}
    >
      <p className="font-semibold">{correct ? "Correct!" : "Not quite"}</p>
      {explanation && <p className="mt-1 text-muted-foreground">{explanation}</p>}
    </motion.div>
  );
}
