"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, PhoneCall, Languages, CheckCircle2 } from "lucide-react";

const STATS = [
  { n: "31%", t: "of new diabetes prescriptions are never filled" },
  { n: "49%", t: "of the visit is all patients accurately recall" },
  { n: "45%", t: "higher mortality when the newly diagnosed don't follow through" },
];

const STEPS = [
  { icon: PhoneCall, t: "Calls you after the visit" },
  { icon: Languages, t: "Explains it in plain language" },
  { icon: CheckCircle2, t: "Gets your follow-ups done" },
];

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-y-auto px-6 py-10">
      {/* soft ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-3xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1.5 text-[12px] font-medium text-teal-200">
          <Activity size={14} /> Aftervisit
        </div>

        <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Care doesn&apos;t end <span className="text-teal-300">when the visit does.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--muted)]">
          A voice-first AI care team that calls after your appointment, turns the jargon into a
          plain-language plan, and actually handles the follow-through.
        </p>

        {/* how it works */}
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12.5px] text-[var(--muted)]">
          {STEPS.map((s, i) => (
            <div key={s.t} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <s.icon size={14} className="text-teal-300" /> {s.t}
              </span>
              {i < STEPS.length - 1 && <span className="text-[var(--border)]">→</span>}
            </div>
          ))}
        </div>

        {/* stats */}
        <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-4 backdrop-blur"
            >
              <div className="text-[26px] font-semibold tracking-tight text-teal-300">{s.n}</div>
              <div className="mt-1 text-[12px] leading-snug text-[var(--muted)]">{s.t}</div>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={onStart}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mx-auto mt-10 flex items-center gap-2 rounded-full bg-teal-500 px-7 py-3 text-[15px] font-semibold text-teal-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400"
        >
          Begin <ArrowRight size={18} />
        </motion.button>

        <p className="mt-6 text-[11px] text-[var(--muted)]">
          Powered by Grok Voice · synthetic demo data · not a substitute for your clinician
        </p>
      </motion.div>
    </div>
  );
}
