import type { MatchResult, MatchLabel } from "@/lib/match";

const labelStyles: Record<MatchLabel, string> = {
  "Good Fit": "border-success text-success",
  "Might Be Too Competitive": "border-vermilion-ink text-vermilion-ink",
  "Might Be Too Casual": "border-ink text-muted",
  "Missing Profile Info": "border-line text-muted",
};

export default function MatchLabel({ match }: { match: MatchResult }) {
  return (
    <div>
      <span
        className={`inline-flex border-2 px-3 py-1 text-sm font-bold uppercase tracking-wide ${labelStyles[match.label]}`}
      >
        {match.label}
      </span>
      <p className="mt-2 text-sm leading-6 text-muted">{match.reason}</p>
    </div>
  );
}
