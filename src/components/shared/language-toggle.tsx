"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Languages } from "lucide-react";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { setLocale } from "@/app/actions/set-locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared AR/EN switcher. Writes the locale cookie via the `setLocale` server
 * action (which persists to the User row only when signed in), then refreshes
 * so the tree re-renders in the new locale. Works for anonymous visitors too,
 * so it can live on the marketing/auth pages as well as the app sidebar.
 *
 * The pending guard disables the button during the transition, preventing a
 * double-click from firing two overlapping toggles.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function toggleLocale() {
    startTransition(async () => {
      try {
        await setLocale(locale === "en" ? "ar" : "en");
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-2", className)}
      onClick={toggleLocale}
      disabled={isPending}
    >
      <Languages className="size-4" />
      {t("common.language")}
    </Button>
  );
}
