"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { field, label, btnPrimary, errorPanel, successPanel } from "@/lib/ui";

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];
const positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const playStyles = ["Playmaker", "Scorer", "Shooter", "Slasher", "Defender", "Rebounder", "All-around"];
const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
const availabilityOptions = ["Weekday mornings", "Weekday evenings", "Weekends", "Flexible"];

type ProfileFields = {
  display_name: string;
  area: string;
  skill_level: string;
  primary_position: string;
  play_style: string;
  competitiveness: string;
  availability: string;
  max_travel_distance: string;
};

const emptyProfile: ProfileFields = {
  display_name: "",
  area: "",
  skill_level: "",
  primary_position: "",
  play_style: "",
  competitiveness: "",
  availability: "",
  max_travel_distance: "",
};

export default function ProfileForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "ready">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [fields, setFields] = useState<ProfileFields>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setStatus("unauthenticated");
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "display_name, area, skill_level, primary_position, play_style, competitiveness, availability, max_travel_distance",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profile) {
        setFields({
          display_name: profile.display_name ?? "",
          area: profile.area ?? "",
          skill_level: profile.skill_level ?? "",
          primary_position: profile.primary_position ?? "",
          play_style: profile.play_style ?? "",
          competitiveness: profile.competitiveness ?? "",
          availability: profile.availability ?? "",
          max_travel_distance:
            profile.max_travel_distance === null ? "" : String(profile.max_travel_distance),
        });
      }

      setStatus("ready");
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ProfileFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: fields.display_name || null,
      area: fields.area || null,
      skill_level: fields.skill_level || null,
      primary_position: fields.primary_position || null,
      play_style: fields.play_style || null,
      competitiveness: fields.competitiveness || null,
      availability: fields.availability || null,
      max_travel_distance:
        fields.max_travel_distance === "" ? null : Number(fields.max_travel_distance),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSuccess("Profile saved! Redirecting…");
    router.push("/dashboard");
  }

  if (status === "loading") {
    return <p className="mt-10 text-sm text-muted">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="mt-10 border-2 border-ink bg-paper p-6">
        <p className="text-muted">
          You need to be logged in to set up your profile.
        </p>
        <Link href="/login" className={`mt-4 ${btnPrimary}`}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="displayName" className={label}>
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            placeholder="Darren C."
            value={fields.display_name}
            onChange={(event) => update("display_name", event.target.value)}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="area" className={label}>
            City / area
          </label>
          <input
            id="area"
            type="text"
            placeholder="North Side, Chicago"
            value={fields.area}
            onChange={(event) => update("area", event.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="skillLevel" className={label}>
            Skill level
          </label>
          <select
            id="skillLevel"
            value={fields.skill_level}
            onChange={(event) => update("skill_level", event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select skill level
            </option>
            {skillLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="position" className={label}>
            Primary position
          </label>
          <select
            id="position"
            value={fields.primary_position}
            onChange={(event) => update("primary_position", event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select position
            </option>
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
          <label htmlFor="playStyle" className={label}>
            Play style
          </label>
          <select
            id="playStyle"
            value={fields.play_style}
            onChange={(event) => update("play_style", event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select play style
            </option>
            {playStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="competitiveness" className={label}>
            Competitiveness preference
          </label>
          <select
            id="competitiveness"
            value={fields.competitiveness}
            onChange={(event) => update("competitiveness", event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select competitiveness
            </option>
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
          <label htmlFor="availability" className={label}>
            Availability
          </label>
          <select
            id="availability"
            value={fields.availability}
            onChange={(event) => update("availability", event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select availability
            </option>
            {availabilityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="maxTravelDistance" className={label}>
            Max travel distance (miles)
          </label>
          <input
            id="maxTravelDistance"
            type="number"
            min={0}
            placeholder="10"
            value={fields.max_travel_distance}
            onChange={(event) => update("max_travel_distance", event.target.value)}
            className={field}
          />
        </div>
      </div>

      {error && (
        <p className={errorPanel}>
          {error}
        </p>
      )}

      {success && (
        <p className={successPanel}>
          {success}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className={btnPrimary}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        <Link
          href="/dashboard"
          className="text-center text-sm font-bold uppercase tracking-wide text-muted transition hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </form>
  );
}
