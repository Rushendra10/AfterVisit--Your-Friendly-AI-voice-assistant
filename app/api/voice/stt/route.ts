import { NextResponse } from "next/server";

// Grok Voice STT proxy -> POST https://api.x.ai/v1/stt (multipart; `file` last).
// Returns { text }. Falls back to 501 (browser SpeechRecognition) when no key.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.XAI_API_KEY;
  if (!key) return NextResponse.json({ error: "not configured" }, { status: 501 });

  let audio: Blob | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof Blob) audio = f;
  } catch {
    /* noop */
  }
  if (!audio) return NextResponse.json({ error: "no audio" }, { status: 400 });

  const base = process.env.XAI_VOICE_BASE_URL || "https://api.x.ai/v1";

  try {
    const up = new FormData();
    up.append("language", "en");
    up.append("format", "true");
    // per xAI docs the `file` field must be appended LAST
    up.append("file", audio, "speech.webm");
    const r = await fetch(`${base}/stt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: up,
    });
    if (!r.ok) return NextResponse.json({ error: `stt upstream ${r.status}` }, { status: 502 });
    const data = (await r.json()) as { text?: string };
    return NextResponse.json({ text: data.text ?? "" });
  } catch {
    return NextResponse.json({ error: "stt error" }, { status: 502 });
  }
}
