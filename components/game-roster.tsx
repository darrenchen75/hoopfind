import type { RosterEntry } from "@/lib/roster";

type Props = {
  access: "loggedOut" | "notJoined" | "authorized" | "error";
  roster: RosterEntry[];
  error: boolean;
};

const note = "mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-zinc-300";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">{value || "Not provided"}</dd>
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
        <li
          key={i}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <p className="text-base font-semibold text-zinc-100">
            {entry.displayName}
          </p>
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
