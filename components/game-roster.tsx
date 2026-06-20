import type { RosterEntry } from "@/lib/roster";
import { note } from "@/lib/ui";

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
      {roster.map((entry, i) => (
        <li key={i} className="border-2 border-ink bg-paper p-4">
          <p className="text-base font-semibold text-ink">{entry.displayName}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Field label="Skill level" value={entry.skillLevel} />
            <Field label="Position" value={entry.primaryPosition} />
            <Field label="Play style" value={entry.playStyle} />
          </dl>
        </li>
      ))}
    </ul>
  );
}
