import { getStaticAggregated } from "@/lib/staticStore.server";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(getStaticAggregated());
}
