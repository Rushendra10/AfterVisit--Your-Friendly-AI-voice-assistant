"use client";

// Browser client for the Grok realtime voice agent. Streams mic PCM16 @ 24 kHz
// to the proxy, plays the model's audio back, supports barge-in, and surfaces
// transcripts. The user's speech is reported as ONE growing utterance (final
// flag) so the UI shows a single live bubble, not one per partial.

export interface RealtimeCallbacks {
  onReady?: () => void;
  onUser?: (text: string, final: boolean) => void;
  onRemy?: (text: string) => void;
  onError?: (msg: string) => void;
}

export interface RealtimeController {
  stop: () => void;
  sendText: (text: string) => void;
  greet: () => void;
}

const SR = 24000;

function floatToPCM16Base64(f32: Float32Array): string {
  const buf = new ArrayBuffer(f32.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function pcm16Base64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const len = bin.length >> 1;
  const out = new Float32Array(len);
  const view = new DataView(new ArrayBuffer(2));
  for (let i = 0; i < len; i++) {
    view.setUint8(0, bin.charCodeAt(i * 2));
    view.setUint8(1, bin.charCodeAt(i * 2 + 1));
    out[i] = view.getInt16(0, true) / 0x8000;
  }
  return out;
}

export async function startRealtimeVoice(cb: RealtimeCallbacks): Promise<RealtimeController> {
  const port = process.env.NEXT_PUBLIC_VOICE_PROXY_PORT || "8787";
  const ws = new WebSocket(`ws://${location.hostname}:${port}`);
  const audioCtx = new AudioContext({ sampleRate: SR });
  let stream: MediaStream | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stopped = false;

  let playhead = 0;
  let scheduled: AudioBufferSourceNode[] = [];
  let remyBuf = "";
  let userBuf = "";
  let activeResponse = false;

  const stopPlayback = () => {
    scheduled.forEach((s) => {
      try { s.stop(); } catch {}
    });
    scheduled = [];
    playhead = audioCtx.currentTime;
  };

  const playChunk = (f32: Float32Array) => {
    if (stopped || f32.length === 0) return;
    const buf = audioCtx.createBuffer(1, f32.length, SR);
    buf.getChannelData(0).set(f32);
    const node = audioCtx.createBufferSource();
    node.buffer = buf;
    node.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (playhead < now) playhead = now;
    node.start(playhead);
    playhead += buf.duration;
    scheduled.push(node);
    node.onended = () => {
      scheduled = scheduled.filter((s) => s !== node);
    };
  };

  const send = (obj: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { workletNode?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { ws.close(); } catch {}
    try { void audioCtx.close(); } catch {}
  };

  const sendText = (text: string) => {
    send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
    send({ type: "response.create" });
  };
  const greet = () => send({ type: "response.create" });

  const startMic = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    await audioCtx.audioWorklet.addModule("/pcm-worklet.js");
    source = audioCtx.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(audioCtx, "pcm-capture");
    workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (stopped || ws.readyState !== WebSocket.OPEN) return;
      send({ type: "input_audio_buffer.append", audio: floatToPCM16Base64(e.data) });
    };
    source.connect(workletNode);
    const sink = audioCtx.createGain();
    sink.gain.value = 0;
    workletNode.connect(sink).connect(audioCtx.destination);
  };

  ws.addEventListener("message", async (e) => {
    let ev: { type?: string; delta?: string; transcript?: string; message?: string };
    try {
      ev = JSON.parse(typeof e.data === "string" ? e.data : await (e.data as Blob).text());
    } catch {
      return;
    }
    const type = ev.type || "";

    if (type === "proxy.ready" || type === "session.created" || type === "session.updated") {
      if (!source) {
        try {
          await audioCtx.resume();
          await startMic();
          cb.onReady?.();
        } catch (err) {
          cb.onError?.("mic: " + (err as Error).message);
          stop();
        }
      }
      return;
    }
    if (type === "error") {
      console.warn("[realtime] server error (non-fatal):", ev.message || JSON.stringify(ev).slice(0, 200));
      return;
    }
    if (type === "response.created") {
      activeResponse = true;
      if (userBuf.trim()) cb.onUser?.(userBuf.trim(), true); // finalize the user's turn
      userBuf = "";
      return;
    }
    if (type.endsWith("input_audio_buffer.speech_started")) {
      stopPlayback();
      if (activeResponse) send({ type: "response.cancel" });
      return;
    }
    if (type === "response.output_audio.delta" && ev.delta) {
      playChunk(pcm16Base64ToFloat32(ev.delta));
      return;
    }
    if (type === "response.output_audio_transcript.delta" && ev.delta) {
      remyBuf += ev.delta;
      return;
    }
    if (type === "response.output_audio_transcript.done" || type === "response.done") {
      activeResponse = false;
      if (remyBuf.trim()) cb.onRemy?.(remyBuf.trim());
      remyBuf = "";
      return;
    }
    // user transcript -> accumulate into one growing utterance
    if (type.includes("input_audio_transcription")) {
      if (ev.transcript) userBuf = ev.transcript;
      else if (type.endsWith("delta") && ev.delta) userBuf += ev.delta;
      if (userBuf.trim()) cb.onUser?.(userBuf.trim(), false);
      return;
    }
  });

  ws.addEventListener("error", () => console.warn("[realtime] websocket error"));
  ws.addEventListener("close", (e) => {
    console.warn("[realtime] websocket closed", (e as CloseEvent).code, (e as CloseEvent).reason);
    if (!stopped) cb.onError?.("connection closed");
    stop();
  });

  return { stop, sendText, greet };
}
