import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIDIVERSE — Audio Morphing",
  description: "Variazione timbrica strutturale da Source Reference",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
