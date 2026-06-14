import { NextResponse } from "next/server";

// Mock "agentic action" layer. Each call simulates the care companion executing
// a real task (pharmacy order, scheduling, referral, etc.). Deterministic so the
// demo never breaks; the UI shows the resulting action cards. The genuine
// round-trip is what makes the agency real in the network tab.

export const dynamic = "force-dynamic";

const KNOWN_TOOLS: Record<string, string> = {
  order_rx: "Prescription routed to pharmacy",
  book_followup: "Follow-up appointment booked",
  refer: "Specialist referral sent",
  set_reminder: "Medication reminder scheduled",
  flag_record_error: "Record correction flagged for review",
  find_peer: "Searched opted-in peer community",
};

export async function POST(req: Request) {
  let tool = "";
  let args: Record<string, unknown> = {};
  try {
    const body = (await req.json()) as { tool?: string; args?: Record<string, unknown> };
    tool = body.tool || "";
    args = body.args || {};
  } catch {
    /* noop */
  }
  if (!KNOWN_TOOLS[tool]) {
    return NextResponse.json({ ok: false, error: `unknown tool: ${tool}` }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    tool,
    message: KNOWN_TOOLS[tool],
    args,
    confirmedAt: new Date().toISOString(),
  });
}
