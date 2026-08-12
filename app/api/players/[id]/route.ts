import { NextRequest, NextResponse } from "next/server";
import { getStaticPlayerProfile } from "@/lib/staticStore.server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const profile = getStaticPlayerProfile(id);
  if (!profile) {
    return NextResponse.json({ detail: "Player not found in this position pool" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
