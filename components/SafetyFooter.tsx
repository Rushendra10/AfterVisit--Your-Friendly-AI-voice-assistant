"use client";

import { ShieldCheck } from "lucide-react";
import { SAFETY_FOOTER } from "@/lib/config";

export function SafetyFooter() {
  return (
    <footer className="flex items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--panel)]/60 px-4 py-1.5 text-[11px] text-[var(--muted)]">
      <ShieldCheck size={13} className="text-teal-400" />
      <span>{SAFETY_FOOTER}</span>
    </footer>
  );
}
