import { NextResponse } from "next/server";

// Grok Voice TTS proxy -> POST https://api.x.ai/v1/tts
// Returns raw mp3 bytes. Falls back to 501 (browser voices) when no key is set.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.XAI_API_KEY;
  if (!key) return new NextResponse("voice provider not configured", { status: 501 });

  let text = "";
  let voice = "ara";
  let speed = 0.95;
  try {
    const body = (await req.json()) as { text?: string; voice?: string; speed?: number };
    text = (body.text || "").slice(0, 15000);
    voice = body.voice || "ara";
    if (typeof body.speed === "number") speed = Math.min(1.5, Math.max(0.7, body.speed));
  } catch {
    /* noop */
  }
  if (!text) return new NextResponse("missing text", { status: 400 });

  const base = process.env.XAI_VOICE_BASE_URL || "https://api.x.ai/v1";

  try {
    const r = await fetch(`${base}/tts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice_id: voice,
        language: "en",
        speed,
        output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 },
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return new NextResponse(`tts upstream ${r.status} ${detail.slice(0, 200)}`, { status: 502 });
    }
    const buf = await r.arrayBuffer();
    return new NextResponse(Buffer.from(buf), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("tts error", { status: 502 });
  }
}
