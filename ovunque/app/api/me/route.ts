import { NextResponse } from "next/server";
import { getIdentity } from "../../../cursor/identity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getIdentity(request);
  if (!identity.verified) {
    return NextResponse.json(
      { signedIn: false, reason: identity.reason },
      { headers: { "cache-control": "private, no-store" } },
    );
  }
  if (identity.kind !== "person") {
    return NextResponse.json(
      { signedIn: false, reason: "not_a_person" },
      { headers: { "cache-control": "private, no-store" } },
    );
  }
  return NextResponse.json(
    {
      signedIn: true,
      name: identity.name || "Dig List user",
      email: identity.email,
      simulated: identity.simulated,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
