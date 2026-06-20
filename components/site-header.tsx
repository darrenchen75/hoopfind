import Link from "next/link";
import AuthNav from "@/components/auth-nav";

export default function SiteHeader() {
  return (
    <header className="border-b-2 border-ink">
      <nav className="flex items-center justify-between py-4">
        <Link
          href="/"
          className="font-display text-3xl font-black uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          HoopFind
        </Link>

        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link
            href="/games"
            className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
          >
            Browse games
          </Link>
          <AuthNav />
        </div>
      </nav>
    </header>
  );
}
