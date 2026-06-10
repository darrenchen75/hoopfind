import type { MatchResult, MatchLabel } from "@/lib/match";

const labelStyles: Record<MatchLabel, string> = {
  "Good Fit": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  "Might Be Too Competitive": "border-red-500/40 bg-red-500/10 text-red-300",
  "Might Be Too Casual": "border-sky-500/40 bg-sky-500/10 text-sky-300",
  "Missing Profile Info": "border-zinc-700 bg-zinc-900 text-zinc-300",
};

export default function MatchLabel({ match }: { match: MatchResult }) {
  return (
    <div>
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${labelStyles[match.label]}`}
      >
        {match.label}
      </span>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{match.reason}</p>
    </div>
  );
}
