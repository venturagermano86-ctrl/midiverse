import type { Metadata } from "next";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/900.css";
import { CollectionProvider } from "@/components/CollectionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dig List · Store (private)",
  description:
    "Private Dig List expansion: charts, genres, wishlist, compare Beatport / Bandcamp / Decks prices. Not the official diglist.midivrs.com.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="atmosphere antialiased">
        <CollectionProvider>
          <SiteHeader />
          {children}
          <footer className="mt-20 border-t border-line px-5 py-10 text-sm text-muted md:px-10">
            <p className="font-display text-sm font-black uppercase tracking-[0.14em] text-mist">
              Dig List
            </p>
            <p className="mt-2 max-w-xl text-soft">
              Sandbox privato — marketplace + wishlist + generi. Non è il sito ufficiale{" "}
              <a
                href="https://diglist.midivrs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-signal hover:text-signal-hi"
              >
                diglist.midivrs.com
              </a>
              . powered by <span className="font-black tracking-wider text-signal">MIDIVRS</span>
            </p>
          </footer>
        </CollectionProvider>
      </body>
    </html>
  );
}
