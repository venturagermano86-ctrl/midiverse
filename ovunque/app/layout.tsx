import type { Metadata } from "next";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "OVUNQUE — free o prezzo più basso su tutti i portali",
  description:
    "Scansiona Beatport, Bandcamp, SoundCloud e gli altri. Se è gratis scarichi free; se è a pagamento, vince chi costa meno.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="atmosphere antialiased">
        <SiteHeader />
        {children}
        <footer className="mt-20 border-t border-white/10 px-5 py-10 text-sm text-mist/40 md:px-10">
          <p className="font-display font-semibold text-mist/60">OVUNQUE</p>
          <p className="mt-2 max-w-xl">
            Motore multi-portale in modalità demo: free (SoundCloud e drop) batte i listini a
            pagamento. I link aprono gli store esterni.
          </p>
        </footer>
      </body>
    </html>
  );
}
