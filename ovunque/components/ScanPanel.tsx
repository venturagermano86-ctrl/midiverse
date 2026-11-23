import { formatPrice } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { ScanReport } from "@/lib/types";

type Props = {
  report: ScanReport;
};

export function ScanPanel({ report }: Props) {
  const found = report.hits.filter((h) => h.status === "found").length;

  return (
    <section className="border border-line bg-panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-mist">Store scan</h2>
          <p className="mt-1 text-sm text-muted">
            Checked {report.portalsChecked} shops · found on {found}
            {report.freeFound ? " · free download hit" : ""}
          </p>
        </div>
        <p className="text-[0.65rem] uppercase tracking-wider text-muted">
          Demo · {new Date(report.scannedAt).toLocaleTimeString("it-IT")}
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {report.hits.map((hit) => (
          <li
            key={hit.storeId}
            className="flex items-center justify-between gap-2 border border-line bg-row px-3 py-2 text-xs"
          >
            <span className="truncate font-semibold text-mist/80">
              {storeName(hit.storeId)}
            </span>
            <span
              className={
                hit.status === "found"
                  ? hit.offer?.kind === "free"
                    ? "text-signal"
                    : "text-mist/70"
                  : "text-muted/50"
              }
            >
              {hit.status === "found"
                ? hit.offer
                  ? formatPrice(hit.offer.priceEur, hit.offer.kind)
                  : "OK"
                : hit.status === "missing"
                  ? "—"
                  : "err"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
