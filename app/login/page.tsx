import SiteHeader from "@/components/site-header";
import AuthForm from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />
        <AuthForm mode="login" redirectTo={redirectTo} />
      </section>
    </main>
  );
}
