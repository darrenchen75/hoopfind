import Link from "next/link";
import SiteHeader from "@/components/site-header";

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];
const positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const playStyles = ["Playmaker", "Scorer", "Shooter", "Slasher", "Defender", "Rebounder", "All-around"];
const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
const availabilityOptions = ["Weekday mornings", "Weekday evenings", "Weekends", "Flexible"];
const fieldClasses = "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none";
const labelClasses = "mb-2 block text-sm font-medium text-zinc-300";

export default function ProfileSetupPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
            Profile setup
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Build your player profile
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            Tell us how you hoop so we can match you with the right runs.
          </p>
        </div>

        <form className="mt-10 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="displayName" className={labelClasses}>
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="Darren C."
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
              <label htmlFor="skillLevel" className={labelClasses}>
                Skill level
              </label>
              <select id="skillLevel" name="skillLevel" className={fieldClasses}>
                {skillLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="position" className={labelClasses}>
                Primary position
              </label>
              <select id="position" name="position" className={fieldClasses}>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="playStyle" className={labelClasses}>
                Play style
              </label>
              <select id="playStyle" name="playStyle" className={fieldClasses}>
                {playStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="competitiveness" className={labelClasses}>
                Competitiveness preference
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
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="availability" className={labelClasses}>
                Availability
              </label>
              <select
                id="availability"
                name="availability"
                className={fieldClasses}
              >
                {availabilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="maxTravelDistance" className={labelClasses}>
                Max travel distance (miles)
              </label>
              <input
                id="maxTravelDistance"
                name="maxTravelDistance"
                type="number"
                min={0}
                placeholder="10"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              className="rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400"
            >
              Save profile
            </button>

            <Link
              href="/dashboard"
              className="text-center text-sm font-semibold text-zinc-300 transition hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}