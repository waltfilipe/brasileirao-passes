import { NextRequest, NextResponse } from "next/server";
import { getStaticPlayerOptions } from "@/lib/staticStore.server";

export function GET(request: NextRequest) {
  return NextResponse.json(getStaticPlayerOptions(request.nextUrl.searchParams));
}
