import Link from "next/link";
import { Big_Shoulders, Inter, Newsreader } from "next/font/google";
import {
  competitivenessLevels,
  sampleGames,
  skillLevels,
  steps,
  trust,
} from "@/lib/landing-content";

const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const serif = Newsreader({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const palette = {
  "--c-paper": "#EFEAE2",
  "--c-ink": "#16130F",
  "--c-vermilion": "#FF3B1D",
  "--c-vermilion-ink": "#C41E0E",
  "--c-muted": "#6B6256",
  "--c-line": "#D8D0C2",
} as React.CSSProperties;

const dStyle = { fontFamily: "var(--font-display)" } as React.CSSProperties;
const sStyle = { fontFamily: "var(--font-serif)" } as React.CSSProperties;

const fitBadge: Record<string, string> = {
  "Good fit": "bg-[var(--c-ink)] text-[var(--c-paper)]",
  "A step up": "bg-[var(--c-vermilion)] text-[var(--c-ink)]",
  "More casual": "border border-[var(--c-ink)] text-[var(--c-ink)]",
};

const mapBg = {
  backgroundColor: "#E7E1D5",
  backgroundImage:
    "repeating-linear-gradient(0deg, #D8D0C2 0 1px, transparent 1px 52px), repeating-linear-gradient(90deg, #D8D0C2 0 1px, transparent 1px 52px)",
} as React.CSSProperties;

function HalfCourt() {
  return (
    <svg
      viewBox="0 0 240 320"
      className="h-full w-full"
      role="img"
      aria-label="Stylized half-court diagram"
    >
      <rect width="240" height="320" fill="var(--c-vermilion)" />
      <g
        stroke="var(--c-paper)"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      >
        <rect x="14" y="14" width="212" height="292" />
        <line x1="96" y1="44" x2="144" y2="44" />
        <circle cx="120" cy="56" r="8" />
        <rect x="90" y="44" width="60" height="124" fill="var(--c-paper)" opacity="0.12" />
        <rect x="90" y="44" width="60" height="124" />
        <circle cx="120" cy="168" r="30" />
        <path d="M40,44 L40,160 A 80,80 0 0 0 200,160 L200,44" />
      </g>
    </svg>
  );
}

function FitDot({ fit }: { fit: string }) {
  const base = "block h-5 w-5 rounded-full border-2";
  if (fit === "Good fit")
    return <span className={`${base} border-[var(--c-paper)] bg-[var(--c-ink)]`} />;
  if (fit === "A step up")
    return (
      <span className={`${base} border-[var(--c-paper)] bg-[var(--c-vermilion)]`} />
    );
  return <span className={`${base} border-[var(--c-ink)] bg-[var(--c-paper)]`} />;
}

const navLink =
  "hover:text-[var(--c-vermilion-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-vermilion)]";

export default function Home() {
  const nearby = [...sampleGames].sort((a, b) => a.distanceMi - b.distanceMi);
  const cards = nearby.slice(0, 3);
  const result = sampleGames[0];

  return (
    <main
      style={palette}
      className={`${body.className} ${display.variable} ${serif.variable} min-h-screen overflow-x-clip bg-[var(--c-paper)] text-[var(--c-ink)]`}
    >
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b-2 border-[var(--c-ink)] bg-[var(--c-paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            style={dStyle}
            className="text-3xl font-black uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-vermilion)]"
          >
            HoopFind
          </Link>
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <Link href="#how" className={`hidden sm:block ${navLink}`}>
              How it works
            </Link>
            <Link href="/games" className={`hidden sm:block ${navLink}`}>
              Browse games
            </Link>
            <Link href="/login" className={navLink}>
              Log in
            </Link>
            <Link
              href="/games"
              className="bg-[var(--c-vermilion)] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--c-ink)] transition hover:bg-[var(--c-ink)] hover:text-[var(--c-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)]"
            >
              Find a game
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid items-stretch border-b-2 border-[var(--c-ink)] lg:grid-cols-[1fr_minmax(220px,320px)]">
          <div className="flex flex-col justify-between py-10 lg:border-r-2 lg:border-[var(--c-ink)] lg:pr-8">
            <div className="flex items-stretch gap-5">
              <span
                className="hidden self-stretch text-xs font-bold uppercase tracking-[0.4em] text-[var(--c-vermilion-ink)] sm:block"
                style={{ writingMode: "vertical-rl" }}
              >
                Pickup, matched to you
              </span>
              <h1
                style={dStyle}
                className="font-black uppercase leading-[0.82] tracking-tight"
              >
                <span className="block text-[clamp(3.25rem,11vw,8rem)]">Stop</span>
                <span className="block text-[clamp(3.25rem,11vw,8rem)] text-[var(--c-vermilion)]">
                  guessing
                </span>
                <span className="block text-[clamp(3.25rem,11vw,8rem)]">
                  the run.
                </span>
              </h1>
            </div>
            <div className="mt-8 max-w-lg">
              <p style={sStyle} className="text-2xl italic leading-snug">
                Find nearby basketball games that match your level — and walk
                onto a court that fits before you ever check in.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/games"
                  style={dStyle}
                  className="bg-[var(--c-vermilion)] px-8 py-4 text-xl font-bold uppercase tracking-wide text-[var(--c-ink)] transition hover:bg-[var(--c-ink)] hover:text-[var(--c-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)]"
                >
                  Find a game
                </Link>
                <Link
                  href="#how"
                  style={dStyle}
                  className="border-2 border-[var(--c-ink)] px-8 py-4 text-xl font-bold uppercase tracking-wide transition hover:bg-[var(--c-ink)] hover:text-[var(--c-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-vermilion)]"
                >
                  How it works
                </Link>
              </div>
            </div>
          </div>
          <div className="min-h-[280px] lg:min-h-0">
            <HalfCourt />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--c-vermilion-ink)]">
              How a match looks
            </p>
            <h2
              style={dStyle}
              className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-5xl"
            >
              You set the filters.
              <br />
              We check the fit.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-[var(--c-muted)]">
              Tell HoopFind your level and how far you will travel. Every nearby
              run is checked against it, so the games you see are worth showing
              up for.
            </p>
            <Link
              href="/profile/setup"
              className="mt-6 inline-block font-bold uppercase tracking-wider text-[var(--c-vermilion-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-vermilion)]"
            >
              Set up your profile →
            </Link>
          </div>

          <div className="border-2 border-[var(--c-ink)] bg-[var(--c-paper)] p-2 shadow-[8px_8px_0_var(--c-ink)]">
            <div className="border border-[var(--c-line)] bg-white/40 p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold uppercase tracking-wider">
                  Find a game near you
                </p>
                <span className="border border-[var(--c-line)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--c-muted)]">
                  Preview
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["Level", "Intermediate"],
                  ["Area", "Riverside"],
                  ["Within", "3 mi"],
                ].map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 border border-[var(--c-ink)] bg-[var(--c-paper)] px-3 py-1.5 text-sm"
                  >
                    <span className="text-[var(--c-muted)]">{k}</span>
                    <span className="font-bold">{v}</span>
                  </span>
                ))}
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">
                1 strong match
              </p>
              <div className="mt-2 border-2 border-[var(--c-ink)] bg-[var(--c-paper)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 style={dStyle} className="text-2xl font-black uppercase leading-none">
                      {result.title}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--c-muted)]">
                      {result.court} · {result.when}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${fitBadge[result.fit]}`}
                  >
                    {result.fit}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 border-y border-[var(--c-line)] py-3 text-center">
                  {[
                    ["Skill", `${result.skillMin.slice(0, 3)}–${result.skillMax.slice(0, 3)}`],
                    ["Players", `${result.current}/${result.max}`],
                    ["Distance", `${result.distanceMi} mi`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--c-muted)]">
                        {k}
                      </dt>
                      <dd className="mt-0.5 font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href="/games"
                  className="mt-4 block bg-[var(--c-ink)] py-2.5 text-center text-sm font-bold uppercase tracking-wider text-[var(--c-paper)] transition hover:bg-[var(--c-vermilion)] hover:text-[var(--c-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-vermilion)]"
                >
                  Join this run
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-[var(--c-ink)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2
              style={dStyle}
              className="text-4xl font-black uppercase sm:text-5xl"
            >
              Near you this week
            </h2>
            <Link
              href="/games"
              className="font-bold uppercase tracking-wider text-[var(--c-vermilion-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-vermilion)]"
            >
              Browse every game →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <ul className="flex flex-col gap-4">
              {cards.map((g) => (
                <li key={g.id}>
                  <Link
                    href="/games"
                    className="block border-2 border-[var(--c-ink)] bg-[var(--c-paper)] p-5 transition hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-vermilion)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          style={dStyle}
                          className="text-3xl font-black uppercase leading-none"
                        >
                          {g.title}
                        </h3>
                        <p className="mt-1.5 text-sm text-[var(--c-muted)]">
                          {g.court} · {g.when}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${fitBadge[g.fit]}`}
                      >
                        {g.fit}
                      </span>
                    </div>
                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--c-line)] pt-3 text-sm">
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--c-muted)]">Skill</dt>
                        <dd className="font-semibold">
                          {g.skillMin}–{g.skillMax}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--c-muted)]">Speed</dt>
                        <dd className="font-semibold">{g.competitiveness}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--c-muted)]">Players</dt>
                        <dd className="font-semibold">
                          {g.current}/{g.max}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--c-muted)]">Away</dt>
                        <dd className="font-semibold">{g.distanceMi} mi</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-2 border-[var(--c-ink)]">
              <div
                className="relative aspect-square w-full lg:aspect-auto lg:h-full lg:min-h-[24rem]"
                style={mapBg}
              >
                <div
                  className="absolute left-[10%] top-[58%] h-[34%] w-[40%] border border-[var(--c-ink)]/20 bg-[var(--c-ink)]/[0.06]"
                  aria-hidden
                />
                <div
                  className="absolute left-1/2 top-1/2 h-[2px] w-[34%] origin-left -rotate-[28deg] bg-[var(--c-vermilion)]"
                  aria-hidden
                />
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  aria-hidden
                >
                  <span className="block h-4 w-4 rounded-full border-[3px] border-[var(--c-paper)] bg-[var(--c-ink)]" />
                </div>
                <span className="absolute left-[calc(50%+0.8rem)] top-[calc(50%-1.4rem)] text-[0.65rem] font-bold uppercase tracking-wider text-[var(--c-ink)]">
                  You
                </span>
                {nearby.map((g) => (
                  <Link
                    key={g.id}
                    href="/games"
                    aria-label={`${g.title} at ${g.court}, ${g.distanceMi} miles away`}
                    className="group absolute -translate-x-1/2 -translate-y-full focus-visible:outline-none"
                    style={{ left: `${g.mapX}%`, top: `${g.mapY}%` }}
                  >
                    <span className="block transition group-hover:scale-125 group-focus-visible:scale-125 motion-reduce:group-hover:scale-100">
                      <FitDot fit={g.fit} />
                    </span>
                    <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap border border-[var(--c-ink)] bg-[var(--c-paper)] px-1.5 py-0.5 text-[0.6rem] font-bold opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      {g.distanceMi} mi
                    </span>
                  </Link>
                ))}
                <div className="absolute bottom-3 left-3 flex flex-col gap-1 border border-[var(--c-ink)] bg-[var(--c-paper)] px-3 py-2 text-[0.65rem] font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-ink)]" /> Good fit
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-vermilion)]" /> A step up
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--c-ink)] bg-[var(--c-paper)]" />{" "}
                    More casual
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="border-y-2 border-[var(--c-ink)] bg-[var(--c-ink)] text-[var(--c-paper)]"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2
            style={dStyle}
            className="mb-10 text-4xl font-black uppercase sm:text-5xl"
          >
            How it works
          </h2>
          <ol className="grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t border-white/25 pt-4">
                <span
                  style={dStyle}
                  className="block text-7xl font-black leading-none text-[var(--c-vermilion)]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-white/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 style={dStyle} className="mb-5 text-3xl font-black uppercase">
              The level index
            </h2>
            <ul className="divide-y divide-[var(--c-line)] border-y border-[var(--c-line)]">
              {skillLevels.map((s, i) => (
                <li key={s.name} className="flex items-baseline gap-4 py-3">
                  <span
                    style={dStyle}
                    className="w-10 text-2xl font-black text-[var(--c-vermilion-ink)]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="w-32 shrink-0 font-bold">{s.name}</span>
                  <span className="text-sm text-[var(--c-muted)]">{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 style={dStyle} className="mb-5 text-3xl font-black uppercase">
              How hard they go
            </h2>
            <ul className="divide-y divide-[var(--c-line)] border-y border-[var(--c-line)]">
              {competitivenessLevels.map((c) => (
                <li key={c.name} className="flex items-baseline gap-4 py-3">
                  <span className="w-40 shrink-0 font-bold">{c.name}</span>
                  <span className="text-sm text-[var(--c-muted)]">{c.note}</span>
                </li>
              ))}
            </ul>
            <p style={sStyle} className="mt-5 text-lg italic text-[var(--c-muted)]">
              Pick your level and your speed — every game shows both, so the run
              you join is the run you expected.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-[var(--c-ink)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2
            style={dStyle}
            className="mb-8 text-3xl font-black uppercase sm:text-4xl"
          >
            Why it holds up
          </h2>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.title} className="border-t border-[var(--c-ink)] pt-3">
                <h3 className="font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-[var(--c-muted)]">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t-2 border-[var(--c-ink)] bg-[var(--c-vermilion)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <h2
            style={dStyle}
            className="text-4xl font-black uppercase leading-[0.9] text-[var(--c-ink)] sm:text-5xl"
          >
            Find your next run.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/games"
              style={dStyle}
              className="bg-[var(--c-ink)] px-8 py-4 text-xl font-bold uppercase tracking-wide text-[var(--c-paper)] transition hover:bg-[var(--c-paper)] hover:text-[var(--c-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)]"
            >
              Find a game
            </Link>
            <Link
              href="/profile/setup"
              style={dStyle}
              className="border-2 border-[var(--c-ink)] px-8 py-4 text-xl font-bold uppercase tracking-wide text-[var(--c-ink)] transition hover:bg-[var(--c-ink)] hover:text-[var(--c-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-paper)]"
            >
              Profile
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-[var(--c-ink)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p
            style={dStyle}
            className="text-2xl font-black uppercase tracking-tight"
          >
            HoopFind
          </p>
          <p style={sStyle} className="text-sm italic text-[var(--c-muted)]">
            Find nearby basketball games that match your level.
          </p>
          <nav className="flex gap-5 text-sm font-bold uppercase tracking-wider">
            <Link href="/games" className={navLink}>
              Games
            </Link>
            <Link href="/profile/setup" className={navLink}>
              Profile
            </Link>
            <Link href="/login" className={navLink}>
              Log in
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
