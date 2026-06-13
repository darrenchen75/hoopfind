"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const gameTypes = ["3v3", "4v4", "5v5", "Open Run"];
const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];
const fieldClasses = "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none";
const labelClasses = "mb-2 block text-sm font-medium text-zinc-300";

type GameFields = {
  title: string;
  location_name: string;
  area: string;
  date: string;
  time: string;
  game_type: string;
  max_players: string;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string;
};

const emptyGame: GameFields = {
  title: "",
  location_name: "",
  area: "",
  date: "",
  time: "",
  game_type: gameTypes[0],
  max_players: "",
  competitiveness: competitivenessLevels[0],
  min_skill_level: skillLevels[0],
  max_skill_level: skillLevels[0],
  notes: "",
};

export default function CreateGameForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "ready">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [fields, setFields] = useState<GameFields>(emptyGame);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        setStatus("unauthenticated");
        return;
      }
      setUserId(user.id);
      setStatus("ready");
    });

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof GameFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    const required: [keyof GameFields, string][] = [
      ["title", "Game title"],
      ["location_name", "Location name"],
      ["area", "City / area"],
      ["date", "Date"],
      ["time", "Time"],
      ["max_players", "Max players"],
    ];
    for (const [key, label] of required) {
      if (!fields[key].trim()) {
        return `${label} is required.`;
      }
    }

    const maxPlayers = Number(fields.max_players);
    if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) {
      return "Max players must be greater than zero.";
    }

    if (skillLevels.indexOf(fields.max_skill_level) < skillLevels.indexOf(fields.min_skill_level)) {
      return "Maximum skill level cannot be below the minimum skill level.";
    }

    const startsAt = new Date(`${fields.date}T${fields.time}`);
    if (Number.isNaN(startsAt.getTime())) {
      return "The date and time combination is not valid.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const startsAt = new Date(`${fields.date}T${fields.time}`);
    const supabase = createClient();
    const { error } = await supabase.from("games").insert({
      creator_id: userId,
      title: fields.title.trim(),
      location_name: fields.location_name.trim(),
      area: fields.area.trim(),
      starts_at: startsAt.toISOString(),
      game_type: fields.game_type,
      max_players: Number(fields.max_players),
      competitiveness: fields.competitiveness,
      min_skill_level: fields.min_skill_level,
      max_skill_level: fields.max_skill_level,
      notes: fields.notes.trim() || null,
      is_public: true,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSuccess("Game created! Redirecting…");
    router.push("/dashboard");
  }

  if (status === "loading") {
    return <p className="mt-10 text-sm text-zinc-400">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-300">You need to be logged in to create a game.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-400"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      <div>
        <label htmlFor="title" className={labelClasses}>
          Game title
        </label>
        <input
          id="title"
          type="text"
          placeholder="Saturday Morning Run"
          value={fields.title}
          onChange={(event) => update("title", event.target.value)}
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
            type="text"
            placeholder="Lincoln Park Courts"
            value={fields.location_name}
            onChange={(event) => update("location_name", event.target.value)}
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="area" className={labelClasses}>
            City / area
          </label>
          <input
            id="area"
            type="text"
            placeholder="North Side, Chicago"
            value={fields.area}
            onChange={(event) => update("area", event.target.value)}
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
            type="date"
            value={fields.date}
            onChange={(event) => update("date", event.target.value)}
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="time" className={labelClasses}>
            Time
          </label>
          <input
            id="time"
            type="time"
            value={fields.time}
            onChange={(event) => update("time", event.target.value)}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="gameType" className={labelClasses}>
            Game type
          </label>
          <select
            id="gameType"
            value={fields.game_type}
            onChange={(event) => update("game_type", event.target.value)}
            className={fieldClasses}
          >
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
            type="number"
            min={2}
            placeholder="10"
            value={fields.max_players}
            onChange={(event) => update("max_players", event.target.value)}
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
          value={fields.competitiveness}
          onChange={(event) => update("competitiveness", event.target.value)}
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
          <select
            id="minSkill"
            value={fields.min_skill_level}
            onChange={(event) => update("min_skill_level", event.target.value)}
            className={fieldClasses}
          >
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
          <select
            id="maxSkill"
            value={fields.max_skill_level}
            onChange={(event) => update("max_skill_level", event.target.value)}
            className={fieldClasses}
          >
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
          rows={4}
          placeholder="Full-court games to 11, win stays on. Bring a light and dark shirt."
          value={fields.notes}
          onChange={(event) => update("notes", event.target.value)}
          className={fieldClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg border border-green-900 bg-green-950/50 px-3 py-2 text-sm text-green-300">
          {success}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create game"}
        </button>

        <Link
          href="/dashboard"
          className="text-center text-sm font-semibold text-zinc-300 transition hover:text-white"
        >
          Cancel and go back
        </Link>
      </div>
    </form>
  );
}
