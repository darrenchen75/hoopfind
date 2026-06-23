import SiteHeader from "@/components/site-header";
import GameForm from "@/components/game-form";

export default function NewGamePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
            Create game
          </p>
          <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
            Post a pickup run
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Share the details so the right players can find your game.
          </p>
        </div>

        <GameForm mode="create" />
      </section>
    </main>
  );
}
