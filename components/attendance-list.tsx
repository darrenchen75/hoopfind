import type { AttendanceStatus, JoinedPlayer } from "@/lib/types";

const statusStyles: Record<AttendanceStatus, string> = {
  Joined: "border-ink text-muted",
  Attended: "border-success text-success",
  Missed: "border-vermilion-ink text-vermilion-ink",
};

export default function AttendanceList({players,}: {players: JoinedPlayer[];}) 
{
  if (players.length === 0) {
    return <p className="mt-2 text-base text-muted">No players have joined yet.</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.name}
          className="flex items-center justify-between border-2 border-ink bg-paper px-4 py-3"
        >
          <span className="text-base text-ink">{player.name}</span>
          <span
            className={`inline-flex border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[player.status]}`}
          >
            {player.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
