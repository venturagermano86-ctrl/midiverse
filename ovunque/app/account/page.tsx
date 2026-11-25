"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCollection } from "@/components/CollectionProvider";
import {
  getBandcampUsername,
  setBandcampUsername,
} from "@/lib/bandcampProfile";

type Me = {
  signedIn: boolean;
  name?: string;
  email?: string;
  simulated?: boolean;
  reason?: string;
};

export default function AccountPage() {
  const { count } = useCollection();
  const [me, setMe] = useState<Me | null>(null);
  const [bcUser, setBcUser] = useState("");
  const [bcSaved, setBcSaved] = useState("");

  useEffect(() => {
    setBcUser(getBandcampUsername());
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = (await res.json()) as Me;
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe({ signedIn: false, reason: "offline" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Private Dig List
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
        Account
      </h1>
      <p className="mt-2 max-w-xl text-sm text-soft">
        Puoi usare Dig List senza login (cerca, play, chart, Short/Long). Accedi solo se vuoi
        wishlist cloud, free drop in chart e cronologia su tutti i device.
      </p>

      <div className="mt-10 max-w-lg space-y-4 rounded-dig-lg border border-line bg-panel p-6">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-signal">
            Bandcamp (Diglist croce)
          </p>
          <p className="mt-2 text-sm text-soft">
            Profilo <strong className="text-mist">pubblico</strong> con dischi comprati:
            collezione + wishlist diventano «già tuoi», poi si incrociano i compratori
            (come Diglist). Se Bandcamp è bloccato da CF, usiamo lo stesso schema sulla
            community.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={bcUser}
              onChange={(e) => setBcUser(e.target.value)}
              placeholder="username Bandcamp"
              className="min-w-[12rem] flex-1 rounded-dig border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none focus:border-signal/60"
            />
            <button
              type="button"
              onClick={() => {
                setBandcampUsername(bcUser);
                setBcSaved(getBandcampUsername() ? "Salvato ✓" : "Rimosso");
              }}
              className="rounded-dig bg-signal px-4 py-2.5 text-sm font-bold text-ink"
            >
              Salva
            </button>
          </div>
          {bcSaved ? <p className="mt-2 text-xs text-muted">{bcSaved}</p> : null}
        </div>
      </div>

      <div className="mt-6 max-w-lg space-y-4 rounded-dig-lg border border-line bg-panel p-6">
        {!me ? (
          <p className="text-muted">Carico account…</p>
        ) : me.signedIn ? (
          <>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-signal">
              Sei dentro
            </p>
            <p className="font-display text-2xl font-black text-mist">{me.name}</p>
            {me.email ? <p className="text-sm text-soft">{me.email}</p> : null}
            {me.simulated ? (
              <p className="text-xs text-muted">
                Viewer simulato in locale — sul publish privato è il tuo login Cursor.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/wishlist"
                className="rounded-dig bg-signal px-4 py-2 text-sm font-bold text-ink"
              >
                Wishlist ({count})
              </Link>
              <Link
                href="/cerca"
                className="rounded-dig border border-line px-4 py-2 text-sm font-semibold text-mist"
              >
                Cerca
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-xl font-black text-mist">Guest mode</p>
            <p className="text-sm text-soft">
              Navigazione libera. Wishlist resta sul device. Per cronologia cloud + Free chart
              submissions: apri l’app privata con il tuo login Cursor (Team visibility).
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/wishlist"
                className="inline-flex rounded-dig border border-line px-4 py-2 text-sm font-semibold text-mist"
              >
                Wishlist locale ({count})
              </Link>
              <Link
                href="/charts"
                className="inline-flex rounded-dig bg-signal px-4 py-2 text-sm font-bold text-ink"
              >
                Charts
              </Link>
            </div>
          </>
        )}
      </div>

      <ol className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft">
        {[
          "Cerca traccia o genere",
          "Ascolta preview",
          "Salva in wishlist",
          "Filtra solo digitale / solo vinile",
          "Compra dal più economico",
        ].map((step, i) => (
          <li key={step} className="inline-flex items-center gap-2">
            <span className="inline-grid h-[22px] w-[22px] place-items-center rounded-full border border-line text-[0.7rem] font-bold text-signal">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </main>
  );
}
