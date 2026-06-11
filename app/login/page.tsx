import SiteHeader from "@/components/site-header";
import AuthForm from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
