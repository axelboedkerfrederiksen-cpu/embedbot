import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="min-h-screen px-6 py-24 text-center">
    <p className="text-sm text-[var(--text-muted)]">Fejl 404</p>
    <h1 className="mt-4 text-4xl">Siden findes ikke</h1>
    <p className="mx-auto mt-5 max-w-md text-[var(--text-muted)]">Linket kan være forældet, eller adressen kan være skrevet forkert.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-6">
      <Link href="/" className="rounded-lg bg-[var(--accent)] px-5 py-3 text-white">Til forsiden</Link>
      <Link href="/support" className="px-5 py-3 underline">Kontakt support</Link>
    </div>
  </main>;
}
