import type { RosterEntry } from "@/lib/roster";
import { note } from "@/lib/ui";
import { reliability } from "@/lib/reliability";

type Props = {
  access: "loggedOut" | "notJoined" | "authorized" | "error";
  roster: RosterEntry[];
  error: boolean;
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value || "Not provided"}</dd>
    </div>
  );
}

export default function GameRoster({ access, roster, error }: Props) {
  if (access === "loggedOut") {
    return <p className={note}>Log in and join this game to see who&apos;s playing.</p>;
  }
  if (access === "notJoined") {
    return <p className={note}>Join this game to view the player roster.</p>;
  }
  if (access === "error") {
    return <p className={note}>We couldn&apos;t determine your roster access. Refresh and try again.</p>;
  }
  if (error) {
    return <p className={note}>We couldn&apos;t load the roster right now. Refresh and try again.</p>;
  }
  if (roster.length === 0) {
    return <p className={note}>No players have joined yet.</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {roster.map((entry, i) => {
        const { pct, decided } = reliability(
          entry.attendedCount,
          entry.missedCount,
        );
        const showUp =
          decided === 0 ? "New" : `${pct}% · ${decided} marked games`;
        return (
          <li key={i} className="border-2 border-ink bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-ink">
                {entry.displayName}
              </p>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Show-up rate
                </p>
                <p className="text-sm font-semibold text-ink">{showUp}</p>
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Field label="Skill level" value={entry.skillLevel} />
              <Field label="Position" value={entry.primaryPosition} />
              <Field label="Play style" value={entry.playStyle} />
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
