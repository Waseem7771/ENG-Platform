"use client";

export function GridBackground({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.93 0.01 80) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.93 0.01 80) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial fade mask */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, transparent 0%, oklch(0.09 0.02 270) 70%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
