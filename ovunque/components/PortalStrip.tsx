import { STORES, STORE_ORDER } from "@/lib/stores";

export function PortalStrip() {
  return (
    <section className="border-y border-white/10 bg-ink/50 py-6">
      <div className="px-5 md:px-10">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">
          Sistema di controllo
        </p>
        <h2 className="mt-2 font-display text-xl font-bold text-mist md:text-2xl">
          {STORE_ORDER.length} portali sotto scansione
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-mist/50">
          Beatport, Bandcamp, Traxsource, Juno, Decks, Discogs, Rough Trade, SoundCloud e gli altri —
          chart live + deep-link reali. Gratis batte i pagati; altrimenti apri lo store.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {STORE_ORDER.map((id) => {
            const s = STORES[id];
            return (
              <li
                key={id}
                className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${
                  s.kind === "free"
                    ? "bg-signal/15 text-signal"
                    : "border border-white/10 text-mist/60"
                }`}
                title={s.blurb}
              >
                {s.name}
                {s.kind === "free" ? " · free" : ""}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
