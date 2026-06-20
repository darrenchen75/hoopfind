"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ParticipationStatus } from "@/lib/participation";
import { btnPrimary, errorPanel } from "@/lib/ui";

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
        className={btnPrimary}
      >
        Log in to join
      </Link>
    );
  }

  if (participationError) {
    return (
      <p className="text-base text-muted">
        We couldn&rsquo;t load your participation status. Refresh and try again.
      </p>
    );
  }

  if (status === "attended" || status === "missed") {
    return (
      <p className="text-base font-medium text-muted">
        {statusLabels[status]}
      </p>
    );
  }

  if (status === "joined") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-success">
          {statusLabels.joined}
        </p>
        {hasStarted ? (
          <p className="text-sm text-muted">
            This game has started, so you can no longer leave.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => run("leave_game")}
            disabled={pending}
            className={btnPrimary}
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
        className={btnPrimary}
      >
        {pending ? "Joining…" : "Join game"}
      </button>
      {disabledReason && (
        <p className="text-sm text-muted">{disabledReason}</p>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className={errorPanel}>
      {message}
    </p>
  );
}
