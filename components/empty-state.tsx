import Link from "next/link";
import { emptyCard, btnSecondary } from "@/lib/ui";

type Props = {
  message: string;
  cta?: { href: string; label: string };
};

export default function EmptyState({ message, cta }: Props) {
  return (
    <div className={emptyCard}>
      <p>{message}</p>
      {cta && (
        <Link href={cta.href} className={`mt-4 ${btnSecondary}`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
