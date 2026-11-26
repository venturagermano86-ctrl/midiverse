import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Vocal Studio — vocals for house & techno",
  description:
    "Genera vocal house/techno o caricali su una tua traccia. Scegli genere, variazione e lunghezza.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${dm.variable} ${instrument.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
