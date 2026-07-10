"use client";

import { useCallback, useRef } from "react";

export function ClickSpark({
  children,
  sparkColor = "#7C3AED",
  sparkCount = 8,
}: {
  children: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createSpark = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement("div");
        const angle = (360 / sparkCount) * i;
        const velocity = 30 + Math.random() * 40;
        const size = 3 + Math.random() * 3;

        spark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${sparkColor};
          pointer-events: none;
          z-index: 50;
        `;

        container.appendChild(spark);

        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * velocity;
        const dy = Math.sin(rad) * velocity;

        spark.animate(
          [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            {
              transform: `translate(${dx}px, ${dy}px) scale(0)`,
              opacity: 0,
            },
          ],
          {
            duration: 500 + Math.random() * 300,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }
        ).onfinish = () => spark.remove();
      }
    },
    [sparkColor, sparkCount]
  );

  return (
    <div ref={containerRef} className="relative" onClick={createSpark}>
      {children}
    </div>
  );
}
