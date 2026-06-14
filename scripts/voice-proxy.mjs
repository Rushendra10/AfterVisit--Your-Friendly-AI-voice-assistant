// Realtime voice proxy: the browser can't attach an Authorization header to a
// WebSocket, so this sidecar holds the key and relays browser <-> xAI realtime.
// On each browser connection it opens a fresh xAI socket and sends a grounded
// session.update (companion persona + the patient's EHR corpus).
//
// Run: node scripts/voice-proxy.mjs   (started alongside Next by `npm run dev`)

import { WebSocketServer } from "ws";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- load env (.env.local) since a standalone script doesn't auto-load it ----
function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const KEY = process.env.XAI_API_KEY;
const MODEL = process.env.XAI_REALTIME_MODEL || "grok-voice-think-fast-1.1";
const PORT = Number(process.env.VOICE_PROXY_PORT || 8787);
const BASE = (process.env.XAI_VOICE_BASE_URL || "https://api.x.ai/v1").replace(/^http/, "ws");

if (!KEY) {
  console.warn("[voice-proxy] XAI_API_KEY not set — realtime voice disabled (UI falls back).");
}

const corpus = (() => {
  try {
    return fs.readFileSync(path.join(ROOT, "data", "ehr", "corpus.txt"), "utf8");
  } catch {
    return "";
  }
})();

const INSTRUCTIONS = [
  "You are Remy, a warm, upbeat care guide on a friendly phone call with Alex Rivera, who was just diagnosed with type 2 diabetes.",
  "",
  "VOICE & TONE: Talk like a close friend who happens to know health stuff — casual, warm, human. Use contractions and everyday words. Never sound clinical, formal, or scripted. Keep replies SHORT: usually one sentence, two at most. Never read lists or lecture. Let Alex lead and react to what they actually say — don't get ahead of them.",
  "",
  "OPEN THE CALL yourself with exactly: \"Hey Alex! I'm Remy, your care guide — how are you feeling?\" Then wait for them.",
  "",
  "HOW THE CALL TENDS TO GO (let it unfold naturally — never dump everything at once):",
  "1) When Alex says they just had a visit and want some clarity, react warmly and ASK what they'd like to make sense of — do NOT start explaining yet. Something like: \"Oh nice — yeah, I saw you just had your appointment. What'd you wanna get clarity on?\" You can mention you'll have Jack pull their latest records.",
  "2) Only once they ask you to simplify or break it down, THEN explain — in plain, everyday words, pulled from their records below, a little at a time (not a list). The gist: their A1c came back at 7.8%, which just nudged them over the line into type 2 diabetes; the doc started metformin to help bring that number down; and there's an eye-exam referral plus a follow-up to recheck in a few months. Keep it human and reassuring. After explaining, gently ask if there's anything else they're wondering about.",
  "3) If they ask about cost or billing, answer from the Estimated Costs record: it's roughly $107 all in — about a $30 visit copay, ~$12 for the 90-day metformin, ~$25 for labs, and ~$40 for the eye exam. Then OFFER to help, phrased as a yes/no question that uses the word \"pharmacy\", e.g.: \"Want me to text your pharmacy to check on the metformin?\" When they say yes, confirm warmly that it's handled — like \"Okay cool — done! I had Pax shoot 'em a text.\"",
  "4) If they say they're scared, struggling, or looking for people/community going through the same thing, lead with real warmth — validate the fear first — then OFFER to connect them, phrased as a yes/no question that uses the word \"connect\", e.g.: \"Oh man, I totally get that — want me to connect you with someone nearby who's going through the same thing?\" When they say yes, confirm it warmly — like \"Done — I connected you with someone, message 'em whenever you're ready.\"",
  "",
  "GROUNDING: Answer from the EHR records below whenever you can. If something isn't in their records but is a fair health question (like \"can I eat rice?\"), give sensible everyday type-2-diabetes guidance and mention it's not in their notes. For real medical decisions, suggest checking with Dr. Lee. If it's outside what you should answer, kindly say so.",
  "",
  "=== EHR RECORDS ===",
  corpus,
].join("\n");

function sessionUpdate() {
  return {
    type: "session.update",
    session: {
      voice: "Ara",
      instructions: INSTRUCTIONS,
      turn_detection: { type: "server_vad" },
      input_audio_transcription: { model: "grok-2-audio" },
      audio: {
        input: { format: { type: "audio/pcm", rate: 24000 } },
        output: { format: { type: "audio/pcm", rate: 24000 } },
      },
    },
  };
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[voice-proxy] listening on ws://localhost:${PORT}  (model: ${MODEL})`);

wss.on("connection", (browser) => {
  if (!KEY) {
    browser.send(JSON.stringify({ type: "error", message: "proxy: XAI_API_KEY not configured" }));
    browser.close();
    return;
  }
  const url = `${BASE}/realtime?model=${encodeURIComponent(MODEL)}`;
  // Node's global WebSocket (undici) supports custom headers via options.
  const upstream = new WebSocket(url, { headers: { Authorization: `Bearer ${KEY}` } });

  const closeBoth = () => {
    try { browser.close(); } catch {}
    try { upstream.close(); } catch {}
  };

  upstream.addEventListener("open", () => {
    upstream.send(JSON.stringify(sessionUpdate()));
    browser.send(JSON.stringify({ type: "proxy.ready" }));
  });
  upstream.addEventListener("message", (e) => {
    const data = typeof e.data === "string" ? e.data : e.data.toString();
    try {
      const ev = JSON.parse(data);
      if (ev.type === "error") console.log("[voice] UPSTREAM ERROR:", data.slice(0, 600));
      else if (!/delta|ping/.test(ev.type || "")) console.log("[voice] up:", ev.type);
    } catch {
      /* ignore */
    }
    if (browser.readyState === 1) browser.send(data);
  });
  upstream.addEventListener("close", closeBoth);
  upstream.addEventListener("error", (e) => {
    try { browser.send(JSON.stringify({ type: "error", message: "upstream: " + (e.message || "ws error") })); } catch {}
    closeBoth();
  });

  browser.on("message", (data) => {
    const s = data.toString();
    try {
      const ev = JSON.parse(s);
      if (ev.type && !/append/.test(ev.type)) console.log("[voice] down:", ev.type);
    } catch {
      /* ignore */
    }
    if (upstream.readyState === 1) upstream.send(s);
  });
  browser.on("close", closeBoth);
  browser.on("error", closeBoth);
});
