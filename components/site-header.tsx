import Link from "next/link";

export default function SiteHeader() {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="text-xl font-bold tracking-tight">
        HoopFind
      </Link>

      <div className="flex items-center gap-4 text-sm text-zinc-300">
        <Link href="/games" className="hover:text-white">
          Browse Games
        </Link>
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
        <Link href="/profile/setup" className="hover:text-white">
          Profile
        </Link>
      </div>
    </nav>
  );
}
