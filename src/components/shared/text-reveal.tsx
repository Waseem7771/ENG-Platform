"use client";

import { motion } from "framer-motion";

export function TextReveal({
  text,
  className = "",
  staggerDelay = 0.03,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  staggerDelay?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const chars = text.split("");

  return (
    <Tag className={`inline-block ${className}`} aria-label={text}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{
            duration: 0.6,
            delay: i * staggerDelay,
            ease: [0.35, 0.35, 0, 1],
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </Tag>
  );
}
