import { NextResponse } from "next/server";
import { getIdentity } from "../../../cursor/identity";
import {
  countVisibleDiggers,
  listVisibleDiggers,
} from "@/lib/wishlist";

export const dynamic = "force-dynamic";

/**
 * Liste digger visibili (wishlist cloud) — per croce Diglist.
 * Richiede login (private/team app); non espone email.
 */
export async function GET(request: Request) {
  const identity = await getIdentity(request);
  if (!identity.verified || identity.kind !== "person") {
    return NextResponse.json(
      { error: "sign_in_required", diggers: [], count: 0 },
      { status: 401 },
    );
  }

  try {
    const [diggers, total] = await Promise.all([
      listVisibleDiggers(100),
      countVisibleDiggers(),
    ]);
    return NextResponse.json(
      {
        count: total,
        me: identity.sub,
        diggers: diggers.map((d) => ({
          ...d,
          mine: d.ownerSub === identity.sub,
        })),
        note:
          total > 0
            ? `${total} liste digger — cuore = wishlist condivisa per la croce`
            : "Nessuna lista ancora — salva con ♥, diventa visibile agli altri digger",
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "liste_unavailable",
        detail: err instanceof Error ? err.message.slice(0, 80) : "db",
        diggers: [],
        count: 0,
      },
      { status: 502 },
    );
  }
}
