import { NextRequest, NextResponse } from "next/server";
import { getStaticPassMap } from "@/lib/staticStore.server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const passFilter = request.nextUrl.searchParams.get("pass_filter") ?? "progressive";
  const payload = getStaticPassMap(id, passFilter);
  if (!payload) {
    return NextResponse.json({ detail: "Pass map not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
