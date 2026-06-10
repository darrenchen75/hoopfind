import Link from "next/link";

import SiteHeader from "@/components/site-header";

const gameTypes = ["3v3", "4v4", "5v5", "Open Run"];
const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];

const fieldClasses =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none";
const labelClasses = "mb-2 block text-sm font-medium text-zinc-300";

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

        <form className="mt-10 flex flex-col gap-6">
          <div>
            <label htmlFor="title" className={labelClasses}>
              Game title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Saturday Morning Run"
              className={fieldClasses}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="locationName" className={labelClasses}>
                Location name
              </label>
              <input
                id="locationName"
                name="locationName"
                type="text"
                placeholder="Lincoln Park Courts"
                className={fieldClasses}
              />
            </div>

            <div>
              <label htmlFor="area" className={labelClasses}>
                City / area
              </label>
              <input
                id="area"
                name="area"
                type="text"
                placeholder="North Side, Chicago"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className={labelClasses}>
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                className={fieldClasses}
              />
            </div>

            <div>
              <label htmlFor="time" className={labelClasses}>
                Time
              </label>
              <input
                id="time"
                name="time"
                type="time"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="gameType" className={labelClasses}>
                Game type
              </label>
              <select id="gameType" name="gameType" className={fieldClasses}>
                {gameTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="maxPlayers" className={labelClasses}>
                Max players
              </label>
              <input
                id="maxPlayers"
                name="maxPlayers"
                type="number"
                min={2}
                placeholder="10"
                className={fieldClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="competitiveness" className={labelClasses}>
              Competitiveness
            </label>
            <select
              id="competitiveness"
              name="competitiveness"
              className={fieldClasses}
            >
              {competitivenessLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="minSkill" className={labelClasses}>
                Minimum skill level
              </label>
              <select id="minSkill" name="minSkill" className={fieldClasses}>
                {skillLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="maxSkill" className={labelClasses}>
                Maximum skill level
              </label>
              <select id="maxSkill" name="maxSkill" className={fieldClasses}>
                {skillLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClasses}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Full-court games to 11, win stays on. Bring a light and dark shirt."
              className={fieldClasses}
            />
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              className="rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400"
            >
              Create game
            </button>

            <Link
              href="/dashboard"
              className="text-center text-sm font-semibold text-zinc-300 transition hover:text-white"
            >
              Cancel and go back
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
