import { NextRequest, NextResponse } from "next/server";
import { getStaticCompare } from "@/lib/staticStore.server";

export function GET(request: NextRequest) {
  const playerA = request.nextUrl.searchParams.get("player_a");
  const playerB = request.nextUrl.searchParams.get("player_b");
  if (!playerA || !playerB) {
    return NextResponse.json({ detail: "player_a and player_b are required" }, { status: 400 });
  }
  const payload = getStaticCompare(playerA, playerB);
  if (!payload) {
    return NextResponse.json(
      { detail: "One or both players not found, or players are from different position pools" },
      { status: 404 },
    );
  }
  return NextResponse.json(payload);
}
