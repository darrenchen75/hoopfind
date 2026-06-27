"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HostParticipant } from "@/lib/roster";
import { errorPanel, note } from "@/lib/ui";

type Props = {
  gameId: string;
  hasStarted: boolean;
  participants: HostParticipant[];
  error: boolean;
};

const statusLabel = {
  joined: "Not marked",
  attended: "Attended",
  missed: "Missed",
} as const;

const SAFE_ERRORS = new Set([
  "Authentication required",
  "Game not found",
  "Attendance status must be attended or missed",
  "Only the game creator can update attendance",
  "Attendance cannot be updated before the game starts",
  "Participant not found for this game",
]);

function attendanceErrorMessage(message: string | undefined): string {
  return message && SAFE_ERRORS.has(message)
    ? message
    : "We couldn't update attendance. Refresh and try again.";
}
const baseBtn =
  "inline-flex min-h-11 flex-1 items-center justify-center border-2 px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none";

export default function HostAttendanceManager({
  gameId,
  hasStarted,
  participants,
  error,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function mark(userId: string, status: "attended" | "missed") {
    setPendingId(userId);
    setErrorMsg(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_participant_attendance", {
      target_game_id: gameId,
      target_user_id: userId,
      new_status: status,
    });

    if (rpcError) {
      setErrorMsg(attendanceErrorMessage(rpcError.message));
      setPendingId(null);
      return;
    }

    router.refresh();
    setPendingId(null);
  }

  if (error) {
    return <p className={note}>We couldn&apos;t load attendance details right now. Refresh and try again.</p>;
  }
  if (participants.length === 0) {
    return <p className={note}>No one has joined this game yet.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {!hasStarted && (
        <p className="border-2 border-ink bg-paper px-4 py-3 text-sm text-muted">
          Attendance controls unlock after the game starts.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li
            key={p.userId}
            className="flex flex-col gap-3 border-2 border-ink bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-base font-semibold text-ink">
                {p.displayName}
              </p>
              <p className="text-sm text-muted">{statusLabel[p.status]}</p>
            </div>

            {hasStarted && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mark(p.userId, "attended")}
                  disabled={pendingId !== null}
                  aria-label={`Mark ${p.displayName} as attended`}
                  aria-pressed={p.status === "attended"}
                  className={`${baseBtn} ${
                    p.status === "attended"
                      ? "border-success bg-success/10 text-success"
                      : "border-ink text-muted hover:border-vermilion"
                  }`}
                >
                  Attended
                </button>
                <button
                  type="button"
                  onClick={() => mark(p.userId, "missed")}
                  disabled={pendingId !== null}
                  aria-label={`Mark ${p.displayName} as missed`}
                  aria-pressed={p.status === "missed"}
                  className={`${baseBtn} ${
                    p.status === "missed"
                      ? "border-vermilion-ink bg-vermilion-ink/10 text-vermilion-ink"
                      : "border-ink text-muted hover:border-vermilion"
                  }`}
                >
                  Missed
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {errorMsg && (
        <p className={errorPanel}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
