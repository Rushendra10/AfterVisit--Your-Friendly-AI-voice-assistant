"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import type { ChatMessage } from "@/lib/types";
import { Avatar } from "./Avatar";
import { TalkBar } from "./TalkBar";

export function ChatTranscript({
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
  const messages = useStore((s) => s.messages);
  const phase = useStore((s) => s.phase);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, phase]);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60">
      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <TalkBar
          onTopic={onTopic}
          onSubmit={onSubmit}
          onConfirm={onConfirm}
          onStartLive={onStartLive}
          onEndLive={onEndLive}
        />
      </div>
    </section>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const setCitation = useStore((s) => s.setCitation);
  const p = PERSONAS[m.persona];
  const isUser = m.role === "user";

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500/20 px-3.5 py-2 text-[13.5px] text-sky-50">
          {m.text}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
      <Avatar p={p} size={30} />
      <div className="max-w-[84%]">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: p.color }}>
            {p.name}
          </span>
          <span className="text-[10px] text-[var(--muted)]">{p.role}</span>
        </div>
        <div
          className="rounded-2xl rounded-tl-sm bg-[var(--panel-2)]/80 px-3.5 py-2 text-[13.5px] leading-relaxed text-[var(--text)]"
          style={{ borderLeft: `2px solid ${p.color}` }}
        >
          {m.text}
        </div>
        {m.citation && (
          <button
            onClick={() => setCitation(m.citation!)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[11px] text-teal-200 hover:bg-teal-500/20"
          >
            <FileText size={11} />
            {m.citation.label} · p.{m.citation.page}
          </button>
        )}
      </div>
    </motion.div>
  );
}
