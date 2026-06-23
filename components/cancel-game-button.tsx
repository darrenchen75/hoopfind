"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, errorPanel } from "@/lib/ui";

export default function CancelGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("games")
      .update({ canceled_at: new Date().toISOString() })
      .eq("id", gameId);
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={btnPrimary}>
        Cancel game
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Cancel this game? Joined players will see it marked canceled. This can&rsquo;t be undone.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={cancel} disabled={pending} className={btnPrimary}>
          {pending ? "Canceling…" : "Yes, cancel game"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="text-sm font-bold uppercase tracking-wide text-muted transition hover:text-ink"
        >
          Keep game
        </button>
      </div>
      {error && <p className={errorPanel}>{error}</p>}
    </div>
  );
}
