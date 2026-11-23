import type { Metadata } from "next";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { CollectionProvider } from "@/components/CollectionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "OVUNQUE — charts & store like Beatport + Bandcamp",
  description:
    "Top charts, genres, BPM/key. Compare Beatport, Bandcamp and more — free wins, else cheapest store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="atmosphere antialiased">
        <CollectionProvider>
          <SiteHeader />
          {children}
          <footer className="mt-20 border-t border-white/10 px-5 py-10 text-sm text-mist/40 md:px-10">
            <p className="font-display font-semibold text-mist/60">OVUNQUE</p>
            <p className="mt-2 max-w-xl text-muted">
              Store energy: Beatport charts + Bandcamp artist buy. Confrontiamo i portali — free o
              prezzo più basso. Catalogo demo.
            </p>
          </footer>
        </CollectionProvider>
      </body>
    </html>
  );
}
