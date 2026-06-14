"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, FolderOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { EHR_DOCS, labelFor } from "@/lib/ehrDocs";
import type { Citation, DocBlock, EhrDocStructured } from "@/lib/types";
import docsData from "@/data/ehr/docs.json";

const DOCS = docsData as unknown as Record<string, EhrDocStructured>;

const SHORT: Record<string, string> = {
  "visit_note.pdf": "Visit Note",
  "labs_a1c.pdf": "A1c & Labs",
  "med_list.pdf": "Medications",
  "billing.pdf": "Costs",
  "problem_list.pdf": "Problems",
  "prior_visit_2025.pdf": "2025 Visit",
  "prior_visit_2024.pdf": "2024 Visit",
};

export function RecordsStage() {
  const citation = useStore((s) => s.activeCitation);
  const setCitation = useStore((s) => s.setCitation);
  const active = citation?.file ?? null;

  const open = (file: string) =>
    setCitation({ file, page: 1, quote: "", label: labelFor(file) } as Citation);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <FolderOpen size={15} className="text-teal-300" />
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">Your records</h2>
        <span className="ml-auto text-[10.5px] text-[var(--muted)]">grounded source · Alex Rivera</span>
      </div>

      {/* doc tray */}
      <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {EHR_DOCS.map((d) => {
          const on = active === d.file;
          return (
            <motion.button
              key={d.file}
              onClick={() => open(d.file)}
              animate={{ scale: on ? 1.03 : 1 }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                on
                  ? "border-teal-400/60 bg-teal-500/15 text-teal-100"
                  : "border-[var(--border)] bg-[var(--panel-2)]/60 text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <FileText size={12} className={on ? "text-teal-300" : ""} />
              {SHORT[d.file] ?? d.label}
            </motion.button>
          );
        })}
      </div>

      {/* viewer */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[#f7f8fb]">
        <AnimatePresence mode="wait">
          {citation ? (
            <DocView key={`${citation.file}-${citation.page}-${citation.quote}`} citation={citation} />
          ) : (
            <motion.div
              key="blank"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--panel-2)] text-center text-[var(--muted)]"
            >
              <FileText size={26} className="opacity-40" />
              <p className="max-w-[260px] text-[12px]">
                When the answer comes from one of your records, it&apos;ll open here with the part Remy is
                pointing to.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {citation && (
        <a
          href={`/ehr/${citation.file}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 self-start text-[11px] text-teal-300 hover:underline"
        >
          View original PDF <ExternalLink size={11} />
        </a>
      )}
    </section>
  );
}

function DocView({ citation }: { citation: Citation }) {
  const doc = DOCS[citation.file];
  const pageIdx = Math.min(Math.max(citation.page - 1, 0), (doc?.pages.length ?? 1) - 1);
  const blocks = useMemo(() => doc?.pages[pageIdx] ?? [], [doc, pageIdx]);
  const quote = citation.quote?.trim() ?? "";

  // first block that contains the quote = the one we point to
  const hlIndex = useMemo(() => {
    if (!quote) return -1;
    const q = quote.toLowerCase();
    return blocks.findIndex((b) => b.t && b.t.toLowerCase().includes(q));
  }, [blocks, quote]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hlIndex < 0 || !hlRef.current) return;
    const el = hlRef.current;
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 220);
    return () => clearTimeout(t);
  }, [hlIndex, citation.file, citation.page]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="h-full w-full"
    >
      <div ref={scrollRef} className="scroll-thin h-full overflow-y-auto px-7 py-6 text-[#0f1b2d]">
        <div className="relative mx-auto max-w-[640px]">
          {blocks.map((b, i) => (
            <Block key={i} b={b} quote={quote} highlight={i === hlIndex} hlRef={i === hlIndex ? hlRef : undefined} />
          ))}

          <div className="mt-6 border-t border-black/10 pt-2 text-center text-[10px] text-black/40">
            {labelFor(citation.file)} · Page {pageIdx + 1} of {doc?.pages.length ?? 1}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Block({
  b,
  quote,
  highlight,
  hlRef,
}: {
  b: DocBlock;
  quote: string;
  highlight: boolean;
  hlRef?: React.RefObject<HTMLDivElement | null>;
}) {
  if (b.s === "sp") return <div className="h-2.5" />;
  if (b.s === "hr") return <hr className="my-2 border-black/10" />;

  const cls =
    b.s === "h1"
      ? "text-[18px] font-bold text-[#0f3d3e]"
      : b.s === "h2"
        ? "mt-3 text-[13px] font-bold text-[#155e63]"
        : b.s === "label"
          ? "text-[11px] text-black/55"
          : b.s === "bullet"
            ? "ml-3 text-[12.5px] leading-relaxed"
            : "text-[12.5px] leading-relaxed";

  const text = b.t ?? "";
  const isBullet = b.s === "bullet";
  const inner =
    highlight && quote ? highlightText(text, quote) : text;

  return (
    <div
      ref={hlRef}
      className={`${cls} ${highlight ? "rounded-md bg-amber-200/50 px-1 py-0.5 ring-2 ring-amber-400/70" : ""}`}
    >
      {isBullet ? <>• {inner}</> : inner}
    </div>
  );
}

function highlightText(text: string, quote: string) {
  const idx = text.toLowerCase().indexOf(quote.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + quote.length);
  const after = text.slice(idx + quote.length);
  return (
    <>
      {before}
      <mark className="rounded bg-amber-400/70 px-0.5 text-black">{match}</mark>
      {after}
    </>
  );
}
