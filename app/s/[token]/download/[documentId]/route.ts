import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("Document downloads are disabled for shared views.", { status: 403 });
}
