"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  CalendarCheck,
  Eye,
  BellRing,
  Flag,
  FileText,
  FlaskConical,
  HeartHandshake,
  Loader2,
  Check,
  ClipboardList,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
import { useStore } from "@/lib/store";

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  pill: Pill,
  calendar: CalendarCheck,
  eye: Eye,
  bell: BellRing,
  flag: Flag,
  file: FileText,
  flask: FlaskConical,
  heart: HeartHandshake,
};

export function ActionsOverlay() {
  const careTeam = useStore((s) => s.careTeamHandled);
  const cards = useStore((s) => s.cards);
  const [open, setOpen] = useState(false);
  const prev = useRef(0);
  const seenCareTeam = useRef(false);

  useEffect(() => {
    if (cards.length > prev.current) setOpen(true);
    prev.current = cards.length;
  }, [cards.length]);

  // reveal once when the care-team-handled items first appear
  useEffect(() => {
    if (careTeam.length > 0 && !seenCareTeam.current) {
      seenCareTeam.current = true;
      setOpen(true);
    }
  }, [careTeam.length]);

  if (careTeam.length === 0 && cards.length === 0) return null;
  const total = careTeam.length + cards.length;

  return (
    <div className="absolute bottom-3 right-3 z-30 w-[18rem]">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 p-2.5 shadow-2xl backdrop-blur"
          >
            <button
              onClick={() => setOpen(false)}
              className="mb-1.5 flex w-full items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              <ClipboardList size={12} className="text-teal-300" /> Your care plan
              <ChevronDown size={14} className="ml-auto" />
            </button>

            <div className="scroll-thin max-h-[46vh] space-y-3 overflow-y-auto">
              {careTeam.length > 0 && (
                <Group label="Handled by your care team" tone="slate">
                  {careTeam.map((h) => {
                    const Icon = ICONS[h.icon] ?? Check;
                    return (
                      <Row
                        key={h.id}
                        Icon={Icon}
                        title={h.title}
                        detail={h.detail}
                        tag={h.by}
                        done
                        readOnly
                      />
                    );
                  })}
                </Group>
              )}

              {cards.length > 0 && (
                <Group label="With your OK" tone="emerald">
                  {cards.map((c) => {
                    const Icon = ICONS[c.icon] ?? Check;
                    return (
                      <Row
                        key={c.id}
                        Icon={Icon}
                        title={c.title}
                        detail={c.detail}
                        done={c.status === "done"}
                      />
                    );
                  })}
                </Group>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ml-auto flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3.5 py-2 text-[12px] text-teal-200 shadow-lg backdrop-blur hover:bg-teal-500/20"
          >
            <ClipboardList size={14} /> Care plan ({total})
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "slate" | "emerald";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`mb-1 flex items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-wide ${
          tone === "emerald" ? "text-emerald-300/80" : "text-slate-400/80"
        }`}
      >
        {tone === "slate" ? <ShieldCheck size={11} /> : <Check size={11} />} {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  Icon,
  title,
  detail,
  tag,
  done,
  readOnly,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  detail: string;
  tag?: string;
  done?: boolean;
  readOnly?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)]/70 p-2"
    >
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
          readOnly ? "bg-slate-500/15 text-slate-300" : "bg-emerald-500/15 text-emerald-300"
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium">
          <span className="truncate">{title}</span>
          {done ? (
            <Check size={12} className={readOnly ? "text-slate-400" : "text-emerald-400"} />
          ) : (
            <Loader2 size={12} className="animate-spin text-[var(--muted)]" />
          )}
        </div>
        <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--muted)]">
          {detail}
          {tag ? <span className="text-slate-500"> · {tag}</span> : null}
        </div>
      </div>
    </motion.div>
  );
}
