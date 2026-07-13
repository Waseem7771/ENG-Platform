"use client";

import { useState } from "react";
import { Loader2, Plus, PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LevelSelect } from "@/components/teacher/level-select";
import { Invite } from "@/components/shared/invite";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import type { Level } from "@/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

interface CreatedClass {
  id: string;
  name: string;
  code: string;
}

export function CreateClassDialog({ onCreated }: { onCreated: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [created, setCreated] = useState<CreatedClass | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep("form");
    setCreated(null);
    setName("");
    setDescription("");
    setLevel("BEGINNER");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("teacher.classNameRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api<CreatedClass>("/api/classes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          level,
        }),
      });
      setCreated(result);
      setStep("success");
      onCreated();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("teacher.createClassFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="brand">
            <Plus className="h-4 w-4" />
            {t("teacher.createClassButton")}
          </Button>
        }
      />
      <DialogContent className="border border-border bg-popover text-foreground sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">{t("teacher.createClassTitle")}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("teacher.createClassSubtitle")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="class-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("teacher.className")}
                </Label>
                <input
                  id="class-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("teacher.classNamePlaceholder")}
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-description" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("teacher.classDescription")} <span className="normal-case text-muted-foreground">({t("teacher.optional")})</span>
                </Label>
                <textarea
                  id="class-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("teacher.classDescriptionPlaceholder")}
                  rows={2}
                  className={`${inputClass} h-auto resize-none py-2.5`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("teacher.classLevel")}</Label>
                <LevelSelect value={level} onChange={setLevel} />
              </div>
              <Button type="submit" variant="brand" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("teacher.createClassSubmit")}
              </Button>
            </form>
          </>
        ) : (
          created && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <PartyPopper className="h-5 w-5 text-sun-deep" />
                  {t("teacher.classReady", { name: created.name })}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t("teacher.shareCodeHint")}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-primary/25 bg-secondary p-6">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{t("teacher.invite")}</span>
                <Invite code={created.code} className="mt-3" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                {t("teacher.done")}
              </Button>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
