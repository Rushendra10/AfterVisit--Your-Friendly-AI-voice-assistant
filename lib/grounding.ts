"use client";

// Picks the EHR line that best supports a given spoken answer, so the records
// panel highlights the ACTUAL text Remy is citing during the live voice turn.

import docsData from "@/data/ehr/docs.json";
import { labelFor } from "./ehrDocs";
import type { Citation, EhrDocStructured } from "./types";

const DOCS = docsData as unknown as Record<string, EhrDocStructured>;

const STOP = new Set(
  ("the a an and or but to of for with your you i it is are be on in at this that as we us our they " +
    "them was were have has had will would can could should about from into over more most just like " +
    "okay yeah so if then not no yes do does did how what why when where which who get go make take " +
    "there here also some any one your you're im its thats new now well good i'm it's that's").split(/\s+/)
);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9.]+/g) || []).filter((t) => t.length >= 3 && !STOP.has(t));
}

export function bestCitation(text: string): Citation | null {
  const qt = new Set(tokens(text));
  if (qt.size === 0) return null;
  let best: { score: number; file: string; page: number; quote: string } | null = null;

  for (const [file, doc] of Object.entries(DOCS)) {
    doc.pages.forEach((blocks, pi) => {
      blocks.forEach((b) => {
        if (!b.t || b.s === "h1") return;
        const bt = tokens(b.t);
        if (bt.length === 0) return;
        let score = 0;
        for (const tk of bt) if (qt.has(tk)) score++;
        if (score > 0 && /\d/.test(b.t) && /\d/.test(text)) score += 0.5; // numeric agreement
        if (best === null || score > best.score) best = { score, file, page: pi + 1, quote: b.t };
      });
    });
  }

  const top = best as { score: number; file: string; page: number; quote: string } | null;
  if (!top || top.score < 2) return null;
  return { file: top.file, page: top.page, quote: top.quote, label: labelFor(top.file) };
}
