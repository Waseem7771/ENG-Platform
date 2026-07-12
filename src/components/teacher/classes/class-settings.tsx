"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { LevelSelect } from "@/components/teacher/level-select";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import type { Level } from "@/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export interface ClassSettingsValue {
  name: string;
  description: string | null;
  level: Level;
}

/** Editable name/description/level form for the class hub's Settings tab. Saves via PATCH /api/classes/[id]. */
export function ClassSettings({
  classId,
  initial,
  onSaved,
}: {
  classId: string;
  initial: ClassSettingsValue;
  onSaved: (updated: ClassSettingsValue) => void;
}) {
  const t = useT();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [level, setLevel] = useState<Level>(initial.level);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<ClassSettingsValue>(`/api/classes/${classId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          level,
        }),
      });
      toast.success(t("teacher.classUpdated"));
      onSaved(updated);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.classUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("teacher.editClass")}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="settings-class-name" className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("teacher.className")}
        </Label>
        <input
          id="settings-class-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="settings-class-description" className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("teacher.classDescription")}
        </Label>
        <textarea
          id="settings-class-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} h-auto resize-none py-2.5`}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("teacher.classLevel")}</Label>
        <LevelSelect value={level} onChange={setLevel} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("teacher.saveChanges")}
      </button>
    </form>
  );
}
