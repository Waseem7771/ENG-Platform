"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";

/**
 * `navigator.clipboard` is only defined on secure contexts (HTTPS/localhost) — it is
 * `undefined` on a plain-HTTP VPS deployment, which is exactly how this app's own
 * default deploy runbook serves it. Falls back to the classic hidden-textarea +
 * `execCommand('copy')` trick, which still works over insecure origins.
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

export function CopyCode({ code, className }: { code: string; className?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    let succeeded = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        succeeded = true;
      } catch {
        succeeded = false;
      }
    }

    if (!succeeded) succeeded = legacyCopy(code);

    if (succeeded) {
      setCopied(true);
      toast.success(t("teacher.codeCopied"));
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t("teacher.copyFailed"));
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "group inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-sm tracking-[0.2em] text-primary transition-colors hover:border-primary/30 hover:bg-secondary",
        className
      )}
      title={t("teacher.copyCodeTitle")}
    >
      {code}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-leaf-text" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground" />
      )}
    </button>
  );
}
