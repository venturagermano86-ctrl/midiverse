/**
 * Home — UI completa (upload, stato, player) in fase 2.
 * API: POST {NEXT_PUBLIC_API_URL}/process
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">MIDIVERSE</h1>
      <p className="mt-2 text-zinc-400">
        Frontend Next.js — collegamento a <code className="text-accent">/process</code> in fase 2
      </p>
    </main>
  );
}
