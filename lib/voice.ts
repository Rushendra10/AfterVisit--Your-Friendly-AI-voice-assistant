"use client";

import type { Persona } from "./types";
import type { VoiceProvider } from "./config";

// Voice layer. Default = Grok (xAI) TTS/STT via /api/voice/*. Falls back to the
// browser Web Speech API. A single-speaker LOCK guarantees only one voice ever
// plays at a time (calls are serialized; the previous clip is stopped first).

const isBrowser = () => typeof window !== "undefined";

// ---- TTS cache + prefetch ---------------------------------------------------
const ttsCache = new Map<string, string>();
const ttsKey = (text: string, voice: string, speed: number) => `${voice}|${speed}|${text}`;

async function fetchTTS(text: string, p: Persona): Promise<string | null> {
  const key = ttsKey(text, p.voice.grokVoice, p.voice.speed);
  const cached = ttsCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: p.voice.grokVoice, speed: p.voice.speed }),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
    ttsCache.set(key, url);
    return url;
  } catch {
    return null;
  }
}

export function prefetchTTS(text: string, p: Persona, provider: VoiceProvider) {
  if (provider === "grok" && text && p.voice.grokVoice) void fetchTTS(text, p);
}

function estimateMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(40000, Math.max(900, words * 360));
}

// ---- browser voices ---------------------------------------------------------
let _voices: SpeechSynthesisVoice[] = [];
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isBrowser() || !("speechSynthesis" in window)) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve((_voices = existing));
  return new Promise((resolve) => {
    const done = () => resolve((_voices = window.speechSynthesis.getVoices()));
    window.speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 500);
  });
}
function pickVoice(hints: string[]): SpeechSynthesisVoice | undefined {
  for (const h of hints) {
    const v = _voices.find((vc) => vc.name.toLowerCase().includes(h.toLowerCase()));
    if (v) return v;
  }
  return _voices.find((v) => v.lang?.startsWith("en"));
}

// ---- single-speaker lock ----------------------------------------------------
let currentAudio: HTMLAudioElement | null = null;
let speakChain: Promise<void> = Promise.resolve();
let speakGen = 0; // bumped by stopSpeaking() to abort queued/active speech

function stopCurrentAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (isBrowser() && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}

export function stopSpeaking() {
  speakGen++;
  stopCurrentAudio();
}

/** Serialized: resolves only after THIS line finishes (or is aborted). */
export function speak(text: string, p: Persona, provider: VoiceProvider, muted: boolean): Promise<void> {
  const gen = speakGen;
  const run = () => (gen === speakGen ? doSpeak(text, p, provider, muted, gen).catch(() => {}) : Promise.resolve());
  speakChain = speakChain.then(run);
  return speakChain;
}

async function doSpeak(
  text: string,
  p: Persona,
  provider: VoiceProvider,
  muted: boolean,
  gen: number
): Promise<void> {
  if (!isBrowser() || !text) return;
  stopCurrentAudio(); // ensure nothing else is playing
  if (gen !== speakGen) return;

  if (muted) {
    await new Promise((r) => setTimeout(r, Math.min(estimateMs(text), 2400)));
    return;
  }

  if (provider === "grok" && p.voice.grokVoice) {
    const url = await fetchTTS(text, p);
    if (gen !== speakGen) return;
    if (url) {
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        currentAudio = audio;
        let settled = false;
        let watchdog: ReturnType<typeof setTimeout>;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          resolve();
        };
        const arm = (ms: number) => {
          clearTimeout(watchdog);
          watchdog = setTimeout(finish, ms);
        };
        audio.onended = finish;
        audio.onerror = finish;
        audio.onloadedmetadata = () => {
          if (isFinite(audio.duration) && audio.duration > 0) arm(audio.duration * 1000 + 1500);
        };
        arm(estimateMs(text) + 8000); // generous fallback until metadata loads
        audio.play().catch(finish);
      });
      return;
    }
    // fall through to browser TTS if Grok failed
  }

  if (!("speechSynthesis" in window)) {
    await new Promise((r) => setTimeout(r, estimateMs(text)));
    return;
  }
  await loadVoices();
  if (gen !== speakGen) return;
  await new Promise<void>((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(p.voice.voiceHints);
      if (v) u.voice = v;
      u.pitch = p.voice.pitch;
      u.rate = p.voice.rate;
      u.lang = v?.lang ?? "en-US";
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
      setTimeout(finish, estimateMs(text) + 1500);
    } catch {
      resolve();
    }
  });
}

// ---- mic recording (live dictation; stop on Enter -> transcribe + send) -----
let rec: { mr: MediaRecorder; chunks: BlobPart[]; stream: MediaStream } | null = null;

export async function startRecording(): Promise<boolean> {
  if (!isBrowser() || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.start();
    rec = { mr, chunks, stream };
    return true;
  } catch {
    return false;
  }
}

export function isRecording(): boolean {
  return !!rec;
}

export function cancelRecording() {
  if (!rec) return;
  const { mr, stream } = rec;
  rec = null;
  try {
    mr.stop();
  } catch {
    /* noop */
  }
  stream.getTracks().forEach((t) => t.stop());
}

export async function stopRecordingAndTranscribe(provider: VoiceProvider): Promise<string> {
  if (!rec) return "";
  const { mr, chunks, stream } = rec;
  rec = null;
  const blob: Blob = await new Promise((resolve) => {
    mr.onstop = () => resolve(new Blob(chunks, { type: "audio/webm" }));
    try {
      mr.stop();
    } catch {
      resolve(new Blob(chunks, { type: "audio/webm" }));
    }
  });
  stream.getTracks().forEach((t) => t.stop());
  if (!blob.size) return "";

  if (provider === "grok") {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "speech.webm");
      const res = await fetch("/api/voice/stt", { method: "POST", body: fd });
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        return (data.text ?? "").trim();
      }
    } catch {
      /* noop */
    }
  }
  return "";
}
