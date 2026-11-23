import { Suspense } from "react";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="px-5 py-16 text-mist/50">Caricamento…</div>}>{children}</Suspense>;
}
