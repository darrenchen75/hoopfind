"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HostParticipant } from "@/lib/roster";

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

const note = "mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-zinc-300";
const baseBtn =
  "rounded-full border px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

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
      setErrorMsg(rpcError.message);
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
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          Attendance controls unlock after the game starts.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li
            key={p.userId}
            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-base font-semibold text-zinc-100">
                {p.displayName}
              </p>
              <p className="text-sm text-zinc-400">{statusLabel[p.status]}</p>
            </div>

            {hasStarted && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mark(p.userId, "attended")}
                  disabled={pendingId !== null}
                  className={`${baseBtn} ${
                    p.status === "attended"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  Attended
                </button>
                <button
                  type="button"
                  onClick={() => mark(p.userId, "missed")}
                  disabled={pendingId !== null}
                  className={`${baseBtn} ${
                    p.status === "missed"
                      ? "border-red-500/50 bg-red-500/15 text-red-300"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
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
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
