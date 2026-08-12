import { getStaticMapsOptions } from "@/lib/staticStore.server";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(getStaticMapsOptions());
}
