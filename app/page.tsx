import Link from "next/link";
import SiteHeader from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="flex flex-1 items-center">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
              Skill-based pickup basketball
            </p>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Find competition that actually is at your level.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              HoopFind helps basketball players discover pickup runs based on
              skill level, competitiveness, location, and availability — not
              just the nearest court.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/games"
                className="rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400"
              >
                Browse public games
              </Link>

              <Link
                href="/profile/setup"
                className="rounded-full border border-zinc-700 px-6 py-3 text-center font-semibold text-zinc-200 transition hover:border-zinc-400 hover:text-white"
              >
                Create player profile
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-800 pt-8 text-sm text-zinc-300 md:grid-cols-3">
          <div>
            <h2 className="font-semibold text-white">Match by skill</h2>
            <p className="mt-2">
              See whether a run is a good fit before you show up.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-white">Find better runs</h2>
            <p className="mt-2">
              Compare competitiveness, game type, player count, and notes.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-white">Build reliability</h2>
            <p className="mt-2">
              Track joined games and basic attendance as the app grows.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
