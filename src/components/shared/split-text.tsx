"use client";

import { motion } from "framer-motion";

export function SplitText({
  text,
  className = "",
  delay = 30,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const chars = text.split("");

  return (
    <span className={className} aria-label={text}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 20, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.35,
            delay: i * (delay / 1000),
            ease: "easeOut" as const,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}
