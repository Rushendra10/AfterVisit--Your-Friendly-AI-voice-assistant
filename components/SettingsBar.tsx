"use client";

import { Activity, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { CONVERSATION } from "@/lib/useConversation";

export function SettingsBar({ onRestart }: { onRestart: () => void }) {
  const muted = useStore((s) => s.muted);
  const toggleMuted = useStore((s) => s.toggleMuted);
  const patient = CONVERSATION.patient;

  return (
    <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)]/70 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/15 text-teal-300">
          <Activity size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Aftervisit</div>
          <div className="text-[10px] text-[var(--muted)]">your post-visit care team</div>
        </div>
      </div>

      <div className="ml-1 hidden rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-[11px] text-[var(--muted)] sm:block">
        <span className="text-[var(--text)]">Alex Rivera</span> · {patient.condition}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleMuted}
          title={muted ? "Unmute voices" : "Mute voices"}
          className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)] hover:border-teal-500/50"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <button
          onClick={onRestart}
          title="Restart"
          className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)] hover:border-teal-500/50"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
}
