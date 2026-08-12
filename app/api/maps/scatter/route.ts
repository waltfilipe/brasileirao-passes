import { NextRequest, NextResponse } from "next/server";
import { getStaticScatter } from "@/lib/staticStore.server";

export function GET(request: NextRequest) {
  const x = request.nextUrl.searchParams.get("x") ?? "xpass_coe_pct";
  const y = request.nextUrl.searchParams.get("y") ?? "test_impact_v2_p90";
  const highlight = request.nextUrl.searchParams.get("highlight");
  return NextResponse.json(getStaticScatter(x, y, highlight));
}
