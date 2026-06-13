import SiteHeader from "@/components/site-header";
import CreateGameForm from "@/components/create-game-form";

export default function NewGamePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
            Create game
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Post a pickup run
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            Share the details so the right players can find your game.
          </p>
        </div>

        <CreateGameForm />
      </section>
    </main>
  );
}