"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import type { SubAgent } from "@/lib/types";

// Top-right "Clicky-style" cards: Remy's sub-agents working on tasks. They never
// speak — they show a Running badge + progress + task list (hover to expand).
export function SubAgentDock() {
  const subAgents = useStore((s) => s.subAgents);
  if (subAgents.length === 0) return null;
  const ordered = [...subAgents].slice(-3).reverse(); // most recent 3, newest on top

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30 flex w-72 flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {ordered.map((sa) => (
          <Card key={sa.id} sa={sa} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Card({ sa }: { sa: SubAgent }) {
  const running = sa.status === "running";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16 }}
      className="group pointer-events-auto w-full overflow-hidden rounded-xl border bg-[var(--panel)]/95 backdrop-blur"
      style={{ borderColor: `${sa.color}66`, boxShadow: `0 0 18px ${sa.color}26, 0 6px 20px rgba(0,0,0,0.35)` }}
    >
      <div className="flex items-center gap-2 p-2.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sa.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium leading-none">
            {sa.name}
            <span className="text-[10px] font-normal text-[var(--muted)]">{sa.role}</span>
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-[var(--muted)]">{sa.title}</div>
        </div>
        {running ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-300">
            <Loader2 size={9} className="animate-spin" /> Running
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-emerald-300">
            <Check size={9} /> Done
          </span>
        )}
      </div>

      {running && (
        <div className="h-0.5 w-full overflow-hidden bg-[var(--panel-2)]">
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{ background: sa.color }}
            animate={{ x: ["-120%", "320%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* task list — always visible so the work the agent did is seen */}
      {sa.tasks.length > 0 && (
        <div className="space-y-1 border-t border-[var(--border)] px-2.5 py-2">
          {sa.tasks.map((t, i) => {
            const taskDone = sa.status === "done" || i < sa.tasks.length - 1;
            return (
              <motion.div
                key={t + i}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted)]"
              >
                {taskDone ? (
                  <Check size={10} className="text-emerald-400" />
                ) : (
                  <Loader2 size={10} className="animate-spin" style={{ color: sa.color }} />
                )}
                {t}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
