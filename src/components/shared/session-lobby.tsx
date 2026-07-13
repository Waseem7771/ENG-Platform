"use client";

import { useT } from "@/components/providers/locale-provider";

/** Structurally matches src/lib/session.ts RosterEntry — the full class roster with a per-student joined flag. */
export interface LobbyRosterEntry {
  studentId: string;
  name: string;
  joined: boolean;
  joinedAt: string | null;
}

/**
 * The pre-start "waiting room" panel, shared by the student and teacher session rooms.
 * Shows the teacher at the top, then every enrolled student with a Here / Not here yet
 * state — so absent students stay visible while the room fills up. Chat lives elsewhere
 * in each room and stays enabled alongside this panel during the lobby.
 */
export function SessionLobby({
  teacherName,
  roster,
  waitingText,
}: {
  teacherName: string;
  roster: LobbyRosterEntry[];
  waitingText?: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="text-sm font-semibold text-foreground">{t("session.lobbyTitle")}</h2>
      {waitingText && <div className="mt-1 text-xs text-muted-foreground">{waitingText}</div>}

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
          {teacherName.charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-sm text-foreground"><bdi>{teacherName}</bdi></span>
        <span className="ms-auto text-[10px] uppercase tracking-wider text-primary">{t("session.teacher")}</span>
      </div>

      <h3 className="mb-2 mt-4 text-xs uppercase tracking-wider text-muted-foreground">
        {t("session.roster")} ({roster.length})
      </h3>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {roster.map((r) => (
          <li key={r.studentId} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
              {r.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-sm text-foreground"><bdi>{r.name}</bdi></span>
            <span
              className={`ms-auto flex shrink-0 items-center gap-1.5 text-[11px] ${
                r.joined ? "text-leaf-text" : "text-muted-foreground"
              }`}
            >
              {r.joined && <span className="h-1.5 w-1.5 rounded-full bg-leaf" />}
              {r.joined ? t("session.joined") : t("session.notJoined")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
