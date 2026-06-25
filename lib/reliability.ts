// "Show-up rate" = share of a player's host-marked games they actually attended.
// `joined` rows are excluded: they are future, unjudged, or simply unmarked.
export function reliability(
  attended: number,
  missed: number,
): { pct: number | null; decided: number } {
  const decided = attended + missed;
  const pct = decided === 0 ? null : Math.round((attended / decided) * 100);
  return { pct, decided };
}
