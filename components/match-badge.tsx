import { getMatchBadge, type MatchResult, type MatchTone } from "@/lib/match";

const toneClass: Record<MatchTone, string> = {
  success: "border-success text-success",
  warning: "border-vermilion-ink text-vermilion-ink",
  muted: "border-ink text-muted",
};

export default function MatchBadge({ match }: { match: MatchResult }) {
  const badge = getMatchBadge(match);
  if (!badge) {
    return null;
  }

  return (
    <span
      className={`shrink-0 border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${toneClass[badge.tone]}`}
    >
      {badge.text}
    </span>
  );
}
