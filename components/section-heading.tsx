import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
};

export default function SectionHeading({ title, subtitle, link }: Props) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="shrink-0 text-sm font-bold uppercase tracking-wide text-vermilion-ink transition hover:text-ink"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
