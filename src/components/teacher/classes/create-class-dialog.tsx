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
import { LevelSelect } from "@/components/teacher/level-select";
import { CopyCode } from "@/components/teacher/copy-code";
import { api, ApiClientError } from "@/lib/api";
import type { Level } from "@/types";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-foreground placeholder:text-white/20 outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

interface CreatedClass {
  id: string;
  name: string;
  code: string;
}

export function CreateClassDialog({ onCreated }: { onCreated: () => void }) {
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
      setError("Class name is required.");
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
      setError(e instanceof ApiClientError ? e.message : "Couldn't create the class.");
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
          <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Create Class
          </button>
        }
      />
      <DialogContent className="border border-white/10 bg-[#15121f] text-white sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Create a class</DialogTitle>
              <DialogDescription className="text-white/50">
                Students will join using an auto-generated code.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="class-name" className="text-xs uppercase tracking-wider text-white/50">
                  Class name
                </Label>
                <input
                  id="class-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Evening Conversation Group"
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-description" className="text-xs uppercase tracking-wider text-white/50">
                  Description <span className="normal-case text-white/25">(optional)</span>
                </Label>
                <textarea
                  id="class-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this class about?"
                  rows={2}
                  className={`${inputClass} h-auto resize-none py-2.5`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-white/50">Level</Label>
                <LevelSelect value={level} onChange={setLevel} />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create class
              </button>
            </form>
          </>
        ) : (
          created && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <PartyPopper className="h-5 w-5 text-amber-400" />
                  {created.name} is ready
                </DialogTitle>
                <DialogDescription className="text-white/50">
                  Share this join code with your students.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
                <span className="text-xs uppercase tracking-widest text-white/40">Join code</span>
                <CopyCode code={created.code} className="px-4 py-2 text-lg" />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                Done
              </button>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
