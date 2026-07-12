"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/providers/locale-provider";
import { CopyCode } from "@/components/teacher/copy-code";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** `window.location.origin` never changes for a mounted component — no real
 * subscription needed, just a same-reference no-op unsubscribe. */
function subscribeNoop() {
  return () => {};
}
function getClientOrigin() {
  return window.location.origin;
}
/** SSR snapshot: `window` doesn't exist on the server, so this renders a
 * relative URL there; `useSyncExternalStore` re-syncs to the real origin on
 * the client without a `useEffect` + `setState` render-after-mount flash. */
function getServerOrigin() {
  return "";
}

/**
 * Same insecure-context fallback `CopyCode` uses (`navigator.clipboard` is
 * undefined outside a secure context, e.g. a plain-HTTP VPS deploy). Kept
 * local: this copies the full join URL, a distinct action from `CopyCode`'s
 * bare-code copy, so the two don't need to share state.
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

/**
 * Shareable class-invite widget: the full `/join?code=` URL with a "Copy
 * link" action, plus the raw code as a fallback (via the existing
 * `CopyCode`). Intentionally dependency-free — no QR code (that's a
 * documented Phase-5 nicety, see task-13-report.md).
 */
export function Invite({ code, className }: { code: string; className?: string }) {
  const t = useT();
  const origin = useSyncExternalStore(subscribeNoop, getClientOrigin, getServerOrigin);
  const [copied, setCopied] = useState(false);

  const url = `${origin}/join?code=${code}`;

  async function handleCopyLink() {
    let succeeded = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        succeeded = true;
      } catch {
        succeeded = false;
      }
    }
    if (!succeeded) succeeded = legacyCopy(url);

    if (succeeded) {
      setCopied(true);
      toast.success(t("teacher.linkCopied"));
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t("teacher.copyLinkFailed"));
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          dir="ltr"
          title={url}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono">{url}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {t("teacher.copyLink")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("teacher.orCode")}</span>
        <CopyCode code={code} />
      </div>
    </div>
  );
}
