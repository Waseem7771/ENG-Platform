"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl border border-border bg-card p-6", className)}>
      <div className="mb-3 h-4 w-1/3 rounded bg-muted" />
      <div className="mb-2 h-3 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message?: string;
  retryLabel?: string;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-coral-soft p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="font-medium text-foreground">{message ?? t("common.error")}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-line-strong"
      >
        {retryLabel ?? t("common.tryAgain")}
      </button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>
      )}
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
