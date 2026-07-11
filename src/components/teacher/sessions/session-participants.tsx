"use client";

import { Users } from "lucide-react";
import type { SessionParticipant } from "@/components/teacher/types";

/** The session API only returns joined students here — the teacher is the room owner, not a participant row. */
export function SessionParticipants({ participants }: { participants: SessionParticipant[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        Participants
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{participants.length}</span>
      </div>
      {participants.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
          Waiting for students to join.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-leaf" />
                </span>
                <span className="truncate text-sm text-foreground">{p.name}</span>
              </div>
              {p.joinedAt && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
