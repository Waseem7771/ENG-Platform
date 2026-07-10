"use client";

import { motion } from "framer-motion";

export function SpotlightBeam({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="absolute -top-[40%] left-1/2 h-[800px] w-[600px] -translate-x-1/2"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 0%, transparent 0deg, oklch(0.65 0.25 280 / 0.06) 60deg, transparent 120deg)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      {/* Central glow */}
      <div
        className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(ellipse, oklch(0.65 0.25 280 / 0.08) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
