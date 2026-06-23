import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GameForm from "@/components/game-form";
import SiteHeader from "@/components/site-header";
import { fetchGameForEdit, isGameStarted, isUuid } from "@/lib/games";
import type { GameFields } from "@/lib/game-fields";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const row = await fetchGameForEdit(id);
  if (!row) {
    notFound();
  }

  if (isGameStarted(row.starts_at) || row.canceled_at !== null) {
    redirect(`/games/${id}`);
  }

  const starts = new Date(row.starts_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const initial: GameFields = {
    title: row.title,
    location_name: row.location_name,
    area: row.area,
    date: `${starts.getFullYear()}-${pad(starts.getMonth() + 1)}-${pad(starts.getDate())}`,
    time: `${pad(starts.getHours())}:${pad(starts.getMinutes())}`,
    game_type: row.game_type,
    max_players: String(row.max_players),
    competitiveness: row.competitiveness,
    min_skill_level: row.min_skill_level,
    max_skill_level: row.max_skill_level,
    notes: row.notes ?? "",
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />
        <div className="mt-12 max-w-3xl">
          <Link
            href={`/games/${id}`}
            className="text-sm text-muted transition hover:text-ink"
          >
            ← Back to game
          </Link>
          <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
            Edit game
          </h1>
          <GameForm mode="edit" gameId={id} initial={initial} />
        </div>
      </section>
    </main>
  );
}
