import { NextRequest, NextResponse } from "next/server";
import { getStaticPlayers } from "@/lib/staticStore.server";

export function GET(request: NextRequest) {
  return NextResponse.json(getStaticPlayers(request.nextUrl.searchParams));
}
