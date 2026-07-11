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
    idle: "border-line-strong bg-card text-foreground hover:border-primary/40",
    selected: "border-primary bg-secondary text-foreground",
    correct: "border-leaf bg-leaf-soft text-leaf-text",
    wrong: "border-destructive bg-coral-soft text-destructive",
    muted: "border-line-strong bg-card text-muted-foreground",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-btn border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-200 disabled:cursor-default ${styles[state]}`}
    >
      {label}
    </button>
  );
}
