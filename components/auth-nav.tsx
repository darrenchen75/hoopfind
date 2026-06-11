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
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
        <Link href="/profile/setup" className="hover:text-white">
          Profile
        </Link>
        <LogoutButton />
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="hover:text-white">
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-orange-500 px-4 py-1.5 font-semibold text-white transition hover:bg-orange-400"
      >
        Sign up
      </Link>
    </>
  );
}
