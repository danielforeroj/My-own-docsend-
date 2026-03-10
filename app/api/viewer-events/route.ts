import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      documentId?: string;
      shareToken?: string | null;
      page?: number;
      mode?: string;
      event?: string;
    };

    if (!payload.documentId || !payload.page) {
      return NextResponse.json({ ok: false, error: "Missing required event fields." }, { status: 400 });
    }

    // Lightweight analytics tie-in for MVP: log structured slide navigation events.
    // This is intentionally non-blocking and infra-free.
    console.info("viewer_event", {
      event: payload.event ?? "slide_change",
      mode: payload.mode ?? "deck",
      documentId: payload.documentId,
      shareToken: payload.shareToken ?? null,
      page: payload.page,
      at: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid event payload." }, { status: 400 });
  }
}
