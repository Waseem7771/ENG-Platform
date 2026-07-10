"use client";

import { motion } from "framer-motion";

export function ShimmerButton({
  children,
  className = "",
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const baseClass =
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-lg shadow-violet-500/25"
      : "bg-white/10 backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20";

  return (
    <motion.button
      type={onClick ? "button" : "submit"}
      className={`group relative overflow-hidden rounded-xl px-8 py-3 font-medium transition-all ${baseClass} ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
