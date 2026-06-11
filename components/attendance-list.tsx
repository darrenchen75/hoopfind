import type { AttendanceStatus, JoinedPlayer } from "@/lib/types";

const statusStyles: Record<AttendanceStatus, string> = {
  Joined: "border-zinc-700 bg-zinc-900 text-zinc-300",
  Attended: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Missed: "border-red-500/40 bg-red-500/10 text-red-300",
};

export default function AttendanceList({players,}: {players: JoinedPlayer[];}) 
{
  if (players.length === 0) {
    return <p className="mt-2 text-base text-zinc-400">No players have joined yet.</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.name}
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <span className="text-base text-zinc-100">{player.name}</span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[player.status]}`}
          >
            {player.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
