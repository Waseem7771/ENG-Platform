"use client";

import { motion } from "framer-motion";

export function GlowCard({
  children,
  className = "",
  glowColor = "from-violet-500/20 via-blue-500/20 to-cyan-500/20",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 backdrop-blur-xl shadow-lg dark:bg-white/5 ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow effect on hover */}
      <div
        className={`pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r ${glowColor} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
