import { NextRequest, NextResponse } from "next/server";
import { getStaticMeta } from "@/lib/staticStore.server";

export function GET(_request: NextRequest) {
  return NextResponse.json(getStaticMeta());
}
