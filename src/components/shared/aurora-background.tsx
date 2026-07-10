"use client";

export function AuroraBackground({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Aurora gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-violet-500/20 blur-[120px]" />
        <div
          className="absolute -right-[5%] top-[20%] h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-[120px]"
          style={{ animationDelay: "1s", animationDuration: "3s" }}
        />
        <div
          className="absolute bottom-0 left-[30%] h-[350px] w-[350px] animate-pulse rounded-full bg-cyan-500/15 blur-[120px]"
          style={{ animationDelay: "2s", animationDuration: "4s" }}
        />
        <div
          className="absolute -bottom-[10%] right-[20%] h-[300px] w-[300px] animate-pulse rounded-full bg-purple-500/15 blur-[120px]"
          style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
