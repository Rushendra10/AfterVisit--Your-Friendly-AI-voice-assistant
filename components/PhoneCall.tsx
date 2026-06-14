"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Activity, Wifi, BatteryFull, SignalHigh } from "lucide-react";

// A synthesized "marimba"-style ringtone via Web Audio (no copyrighted asset).
// Loops until the screen unmounts (Answer / Decline). The preceding Begin click
// satisfies the browser autoplay gesture requirement.
function useRingtone() {
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      void ctx.resume?.();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      const arpeggio = (at: number) => {
        notes.forEach((f, i) => {
          const osc = ctx!.createOscillator();
          const g = ctx!.createGain();
          osc.type = "triangle";
          osc.frequency.value = f;
          const s = at + i * 0.13;
          g.gain.setValueAtTime(0.0001, s);
          g.gain.exponentialRampToValueAtTime(0.22, s + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, s + 0.34);
          osc.connect(g).connect(ctx!.destination);
          osc.start(s);
          osc.stop(s + 0.4);
        });
      };
      const ring = () => {
        if (!ctx || stopped) return;
        const t0 = ctx.currentTime + 0.02;
        arpeggio(t0); // ring…
        arpeggio(t0 + 0.72); // …ring
      };
      ring();
      timer = setInterval(ring, 2800);
    } catch {
      /* no audio available */
    }
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      try {
        void ctx?.close();
      } catch {
        /* noop */
      }
    };
  }, []);
}

// iPhone-style pre-call screen: a lock-screen notification ("records ready")
// + the "do you want to begin?" prompt + a green Answer call button.
export function PhoneCall({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  useRingtone();
  return (
    <div className="relative flex h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative h-[640px] w-[312px] overflow-hidden rounded-[46px] border-[3px] border-[#222b3d] bg-gradient-to-b from-[#0b1424] to-[#0a1020] shadow-2xl"
      >
        {/* dynamic island */}
        <div className="absolute left-1/2 top-2.5 z-20 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />

        {/* status bar */}
        <div className="flex items-center justify-between px-7 pt-3 text-[12px] font-medium text-white/90">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <SignalHigh size={14} /> <Wifi size={14} /> <BatteryFull size={16} />
          </span>
        </div>

        {/* lock-screen notification */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-3 mt-8 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-teal-500/90 text-teal-950">
              <Activity size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Aftervisit
            </span>
            <span className="ml-auto text-[10px] text-white/50">now</span>
          </div>
          <div className="mt-1.5 text-[13px] font-semibold text-white">Your records are ready</div>
          <div className="text-[12px] leading-snug text-white/70">
            Dr. Lee finished filing your records from today&apos;s visit. Your post-visit plan is ready.
          </div>
        </motion.div>

        {/* caller / prompt */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10">
          <motion.div
            className="relative grid h-24 w-24 place-items-center rounded-full"
            style={{ background: "#14b8a61f", border: "2px solid #14b8a6" }}
            animate={{ boxShadow: ["0 0 0 0 #14b8a655", "0 0 0 20px #14b8a600"] }}
            transition={{ repeat: Infinity, duration: 1.7 }}
          >
            <span className="text-3xl font-semibold text-teal-300">R</span>
          </motion.div>

          <div className="mt-4 text-[17px] font-semibold text-white">Aftervisit Care Team</div>
          <div className="mt-1 text-[13px] text-white/60">Do you want to begin?</div>

          <div className="mt-9 flex w-full items-center justify-between px-3">
            <button onClick={onDecline} className="flex flex-col items-center gap-1.5">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600">
                <PhoneOff size={22} />
              </span>
              <span className="text-[11px] text-white/50">Not now</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-1.5">
              <motion.span
                className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              >
                <Phone size={22} />
              </motion.span>
              <span className="text-[11px] text-emerald-300">Answer</span>
            </button>
          </div>
        </div>
      </motion.div>

      <p className="relative mt-6 text-[11px] text-[var(--muted)]">Tap Answer to start your post-visit call</p>
    </div>
  );
}
