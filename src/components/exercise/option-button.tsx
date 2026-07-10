"use client";

export function OptionButton({
  label,
  selected,
  correct,
  revealed,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  /** Whether this option is THE correct answer. */
  correct?: boolean;
  /** Whether feedback has been revealed for the current item. */
  revealed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  let state: "idle" | "selected" | "correct" | "wrong" | "muted" = "idle";
  if (revealed) {
    if (correct) state = "correct";
    else if (selected) state = "wrong";
    else state = "muted";
  } else if (selected) {
    state = "selected";
  }

  const styles: Record<typeof state, string> = {
    idle: "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/[0.05]",
    selected: "border-violet-500/50 bg-violet-500/10 text-white",
    correct: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    wrong: "border-red-500/50 bg-red-500/10 text-red-300",
    muted: "border-white/5 bg-white/[0.01] text-white/30",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 disabled:cursor-default ${styles[state]}`}
    >
      {label}
    </button>
  );
}
