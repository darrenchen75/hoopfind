"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ParticipationStatus } from "@/lib/participation";

const buttonClasses =
  "rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60";

const statusLabels: Record<ParticipationStatus, string> = {
  joined: "You're in for this game.",
  attended: "You attended this game.",
  missed: "You missed this game.",
};

type Props = {
  gameId: string;
  isAuthenticated: boolean;
  status: ParticipationStatus | null;
  participationError: boolean;
  currentPlayers: number;
  maxPlayers: number;
  hasStarted: boolean;
};

export default function GameParticipationButton({
  gameId,
  isAuthenticated,
  status,
  participationError,
  currentPlayers,
  maxPlayers,
  hasStarted,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The database functions enforce capacity/ownership rules, so we never write
  // to game_participants directly. We surface the function's error message and
  // let the server re-render the real count and status on success.
  async function run(action: "join_game" | "leave_game") {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(action, {
      target_game_id: gameId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }

    router.refresh();
    setPending(false);
  }

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?redirectTo=/games/${gameId}`}
        className={`inline-block ${buttonClasses}`}
      >
        Log in to join
      </Link>
    );
  }

  if (participationError) {
    return (
      <p className="text-base text-zinc-400">
        We couldn&rsquo;t load your participation status. Refresh and try again.
      </p>
    );
  }

  if (status === "attended" || status === "missed") {
    return (
      <p className="text-base font-medium text-zinc-300">
        {statusLabels[status]}
      </p>
    );
  }

  if (status === "joined") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-medium text-emerald-300">
          {statusLabels.joined}
        </p>
        {hasStarted ? (
          <p className="text-sm text-zinc-400">
            This game has started, so you can no longer leave.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => run("leave_game")}
            disabled={pending}
            className={buttonClasses}
          >
            {pending ? "Leaving…" : "Leave game"}
          </button>
        )}
        {error && <ErrorMessage message={error} />}
      </div>
    );
  }

  const isFull = currentPlayers >= maxPlayers;
  const disabledReason = hasStarted
    ? "This game has already started."
    : isFull
      ? "This game is full."
      : null;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => run("join_game")}
        disabled={pending || hasStarted || isFull}
        className={buttonClasses}
      >
        {pending ? "Joining…" : "Join game"}
      </button>
      {disabledReason && (
        <p className="text-sm text-zinc-400">{disabledReason}</p>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}
