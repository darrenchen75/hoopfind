"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const fieldClasses =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none";
const labelClasses = "mb-2 block text-sm font-medium text-zinc-300";

type AuthMode = "login" | "signup";

const copy: Record<
  AuthMode,
  { eyebrow: string; title: string; subtitle: string; submit: string; altHref: string; altText: string; altLink: string }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Log in to HoopFind",
    subtitle: "Pick up where you left off and get back to the runs.",
    submit: "Log in",
    altHref: "/signup",
    altText: "New here?",
    altLink: "Create an account",
  },
  signup: {
    eyebrow: "Get started",
    title: "Create your HoopFind account",
    subtitle: "Sign up with your email to start finding games.",
    submit: "Sign up",
    altHref: "/login",
    altText: "Already have an account?",
    altLink: "Log in",
  },
};

export default function AuthForm({ mode, redirectTo }: { mode: AuthMode; redirectTo?: string }) {
  const router = useRouter();
  const text = copy[mode];
  const destination =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("An account with this email already exists. Try logging in.");
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        return;
      }

      setSuccess("Account created. Check your email to confirm, then log in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(destination);
  }

  return (
    <div className="mt-12 w-full max-w-md">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
        {text.eyebrow}
      </p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
        {text.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-zinc-300">{text.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
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

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Please wait…" : text.submit}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400">
        {text.altText}{" "}
        <Link href={text.altHref} className="font-semibold text-orange-400 hover:text-orange-300">
          {text.altLink}
        </Link>
      </p>
    </div>
  );
}
