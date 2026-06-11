import SiteHeader from "@/components/site-header";
import ProfileForm from "@/components/profile-form";

export default function ProfileSetupPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
            Profile setup
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Build your player profile
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            Tell us how you hoop so we can match you with the right runs.
          </p>
        </div>

        <ProfileForm />
      </section>
    </main>
  );
}
