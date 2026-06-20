"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/logout-button";

export default function AuthNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loggedIn === null) {
    return null;
  }

  if (loggedIn) {
    return (
      <>
        <Link
          href="/dashboard"
          className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          Dashboard
        </Link>
        <Link
          href="/profile/setup"
          className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          Profile
        </Link>
        <LogoutButton />
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="bg-vermilion px-4 py-1.5 font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Sign up
      </Link>
    </>
  );
}
