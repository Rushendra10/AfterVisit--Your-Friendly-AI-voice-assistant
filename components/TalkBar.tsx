"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Loader2, CheckCircle2, Square, Check, X, AudioLines } from "lucide-react";
import { useStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import { CONVERSATION } from "@/lib/useConversation";
import { startRecording, stopRecordingAndTranscribe, cancelRecording } from "@/lib/voice";

export function TalkBar({
  onTopic,
  onSubmit,
  onConfirm,
  onStartLive,
  onEndLive,
}: {
  onTopic: (id: string) => void;
  onSubmit: (text: string) => void;
  onConfirm: (yes: boolean) => void;
  onStartLive: () => void;
  onEndLive: () => void;
}) {
  const phase = useStore((s) => s.phase);
  const speaking = useStore((s) => s.speaking);
  const suggestions = useStore((s) => s.suggestions);
  const pendingConfirm = useStore((s) => s.pendingConfirm);

  if (phase === "live") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2">
          <span className="pulse-rec grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-500/30 text-rose-200">
            <AudioLines size={15} />
          </span>
          <div className="min-w-0 flex-1 text-[12px] text-rose-100">
            Live with Remy — just speak.
            <span className="text-rose-200/70"> You can interrupt anytime.</span>
          </div>
          <button
            onClick={onEndLive}
            className="shrink-0 rounded-lg bg-rose-500 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-rose-600"
          >
            End
          </button>
        </div>
        {pendingConfirm ? (
          <ConfirmButtons onConfirm={onConfirm} />
        ) : (
          <>
            <Chips suggestions={suggestions} onTopic={onTopic} />
            <PlainInput onSend={onSubmit} placeholder="…or type instead, Enter to send" />
          </>
        )}
      </div>
    );
  }

  if (phase === "confirming") return <ConfirmButtons onConfirm={onConfirm} />;

  if (phase === "awaitingUser") {
    return (
      <div className="space-y-2">
        <Chips suggestions={suggestions} onTopic={onTopic} />
        <AskInput onSend={onSubmit} />
        <button
          onClick={onStartLive}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-100 transition hover:bg-rose-500/20"
        >
          <AudioLines size={14} /> Talk live with Remy
        </button>
      </div>
    );
  }

  if (phase === "thinking") {
    return (
      <Status>
        <Loader2 size={16} className="animate-spin text-violet-300" /> Jill is looking through your records…
      </Status>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <CheckCircle2 size={16} /> You&apos;re all set — your care team is here whenever you need it.
      </div>
    );
  }

  const who = speaking ? PERSONAS[speaking].name : "Your care team";
  return (
    <Status>
      <span className="flex gap-1">
        <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
      </span>
      {who} is speaking…
    </Status>
  );
}

function Chips({ suggestions, onTopic }: { suggestions: string[]; onTopic: (id: string) => void }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((id) => {
        const topic = CONVERSATION.topics[id];
        if (!topic) return null;
        return (
          <button
            key={id}
            onClick={() => onTopic(id)}
            className="rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[12px] text-teal-100 transition hover:bg-teal-500/20"
          >
            {topic.label}
          </button>
        );
      })}
    </div>
  );
}

function ConfirmButtons({ onConfirm }: { onConfirm: (yes: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onConfirm(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25"
      >
        <Check size={16} /> Yes, please
      </button>
      <button
        onClick={() => onConfirm(false)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        <X size={16} /> Not now
      </button>
    </div>
  );
}

// Plain text input (used during live — the mic is already streaming).
function PlainInput({ onSend, placeholder }: { onSend: (t: string) => void; placeholder: string }) {
  const [value, setValue] = useState("");
  const send = () => {
    const t = value.trim();
    if (t) {
      setValue("");
      onSend(t);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--muted)] focus:border-rose-500/50"
      />
      <button
        onClick={send}
        disabled={!value.trim()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500/80 text-white hover:bg-rose-500 disabled:opacity-40"
        title="Send"
      >
        <Send size={15} />
      </button>
    </div>
  );
}

// Dictate-or-type input for the scripted fallback (mic = record -> STT -> Claude).
function AskInput({ onSend }: { onSend: (t: string) => void }) {
  const voiceProvider = useStore((s) => s.voiceProvider);
  const recording = useStore((s) => s.recording);
  const setRecording = useStore((s) => s.setRecording);
  const [value, setValue] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => cancelRecording();
  }, []);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (t) onSend(t);
    },
    [onSend]
  );

  const stopAndSend = useCallback(async () => {
    setRecording(false);
    setTranscribing(true);
    const text = await stopRecordingAndTranscribe(voiceProvider);
    setTranscribing(false);
    send(text || value);
  }, [voiceProvider, value, send, setRecording]);

  const toggleMic = useCallback(async () => {
    if (recording) {
      await stopAndSend();
      return;
    }
    const ok = await startRecording();
    if (ok) setRecording(true);
  }, [recording, stopAndSend, setRecording]);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void stopAndSend();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, stopAndSend]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMic}
        disabled={transcribing}
        title={recording ? "Stop & send" : "Speak"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          recording ? "pulse-rec bg-red-500 text-white" : "bg-violet-500/30 text-violet-100 hover:bg-violet-500/50"
        }`}
      >
        {transcribing ? <Loader2 size={16} className="animate-spin" /> : recording ? <Square size={16} /> : <Mic size={18} />}
      </button>
      <input
        ref={inputRef}
        value={recording ? "" : value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send(value);
          }
        }}
        placeholder={recording ? "Listening… press Enter when done" : transcribing ? "…" : "Speak or type your question…"}
        disabled={recording || transcribing}
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[14px] outline-none placeholder:text-[var(--muted)] focus:border-violet-500/60"
      />
      <button
        onClick={() => send(value)}
        disabled={!value.trim() || recording || transcribing}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-40"
        title="Send"
      >
        {transcribing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-teal-300"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ repeat: Infinity, duration: 1, delay }}
    />
  );
}
