"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const MotionLink = motion.create(Link);

export function GlowButton({
  children,
  href,
  className = "",
  variant = "primary",
  onClick,
  type,
  disabled = false,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base = "relative overflow-hidden rounded-full px-8 py-3.5 font-medium text-sm uppercase tracking-wider transition-all duration-500 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 via-blue-500 to-violet-600 bg-[length:200%_auto] text-white hover:bg-right",
    secondary:
      "border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:shadow-[inset_0_0_20px_oklch(0.65_0.25_280/0.15)]",
    ghost:
      "text-white/60 hover:text-white",
  };

  const content = (
    <>
      {/* Shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 hover:translate-x-full" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <MotionLink
        href={href}
        className={`inline-block text-center ${base} ${variants[variant]} ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type={type ?? (onClick ? "button" : "submit")}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {content}
    </motion.button>
  );
}
