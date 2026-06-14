import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Live-mode reasoning brain. Spawns the LOCAL Claude CLI (no Anthropic API key
// needed — uses the `claude` install on this machine) to answer the patient's
// question grounded ONLY in the dummy /EHR corpus, returning strict JSON.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
// Use the local CLI's default model unless CLAUDE_MODEL is explicitly set
// (e.g. CLAUDE_MODEL=sonnet for a snappier answer).
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "";

function loadCorpus(): string {
  try {
    return readFileSync(path.join(process.cwd(), "data", "ehr", "corpus.txt"), "utf8");
  } catch {
    return "";
  }
}

function buildPrompt(corpus: string, question: string): string {
  return [
    "You are Remy, a warm, plain-language post-visit care companion for a patient named Alex (newly diagnosed Type 2 Diabetes).",
    "Talk like a kind, casual friend (a 'care guide' companion) — warm, human, never formal or clinical. Use contractions and everyday words. Keep it to 1-2 short sentences. No jargon (define any term in a few plain words). Cut filler, but never drop info that matters to their decision.",
    "Decide which kind of answer this is and set \"scope\":",
    "1) \"grounded\" — the answer IS in the EHR documents below. Answer from them and include a citation (exact file, page, and a SHORT verbatim quote).",
    "2) \"general\" — it's a reasonable health/lifestyle question (e.g., 'can I eat X', 'should I avoid Y') but NOT in the documents. Answer using sound general reasoning for someone with type 2 diabetes, and START by saying you don't see it in their notes (e.g., 'I don't see this in your notes, but generally…'). Use NO citation. Example: processed sugar and refined carbs are usually best limited with diabetes.",
    "3) \"refuse\" — it's outside what you should answer (not health-related, a diagnosis/dosing decision that needs a clinician, or anything risky). Say warmly that you're not in a position to answer that, and offer to help book an appointment if it matters. Use NO citation.",
    "Always reassuring and concrete. For clinical judgments, gently suggest confirming with Dr. Lee. Never invent details about Alex that aren't in the documents.",
    "Pick the citation document that matches the topic (medications -> med_list.pdf, the diagnosis/A1c -> labs_a1c.pdf, the plan -> visit_note.pdf). Only cite when scope is \"grounded\".",
    "",
    "Respond with STRICT JSON ONLY — no prose, no markdown code fences. Schema:",
    '{"answer": string, "scope": "grounded"|"general"|"refuse", "citations": [{"file": string, "page": number, "quote": string, "label": string}]}',
    "",
    "=== EHR DOCUMENTS ===",
    corpus,
    "",
    "=== PATIENT QUESTION ===",
    question,
    "",
    "JSON:",
  ].join("\n");
}

// Best-effort extraction of a JSON object from arbitrary text.
function extractJson(s: string): Record<string, unknown> | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  for (let end = s.length; end > start; end--) {
    if (s[end - 1] !== "}") continue;
    try {
      return JSON.parse(s.slice(start, end));
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "--output-format", "json"];
    if (CLAUDE_MODEL) args.push("--model", CLAUDE_MODEL);
    // stdin must be ignored (not an open pipe): in non-TTY mode `claude -p`
    // otherwise blocks waiting for stdin EOF and never returns.
    const child = spawn(CLAUDE_BIN, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("claude CLI timeout"));
    }, 90000);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude CLI exited ${code}: ${stderr.slice(0, 300)}`));
    });
  });
}

export async function POST(req: Request) {
  let question = "";
  try {
    const body = (await req.json()) as { question?: string };
    question = (body.question || "").trim();
  } catch {
    /* noop */
  }
  if (!question) return NextResponse.json({ error: "missing question" }, { status: 400 });

  const corpus = loadCorpus();
  const prompt = buildPrompt(corpus, question);

  try {
    const raw = await runClaude(prompt);
    // The CLI returns a JSON envelope; the assistant text is in `.result`.
    let resultText = raw;
    try {
      const env = JSON.parse(raw) as { result?: string; text?: string };
      resultText = env.result ?? env.text ?? raw;
    } catch {
      /* raw may already be the text */
    }
    const parsed = extractJson(resultText);
    if (parsed && typeof parsed.answer === "string") {
      const scope = parsed.scope === "general" || parsed.scope === "refuse" ? parsed.scope : "grounded";
      return NextResponse.json({
        answer: parsed.answer,
        scope,
        // only keep citations when the answer is actually grounded in a record
        citations: scope === "grounded" && Array.isArray(parsed.citations) ? parsed.citations : [],
      });
    }
    return NextResponse.json(
      { error: "could not parse model output", raw: resultText.slice(0, 400) },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
