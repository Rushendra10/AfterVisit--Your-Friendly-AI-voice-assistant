import { NextResponse } from "next/server";
import { EHR_DOCS } from "@/lib/ehrDocs";

// Lists the patient's EHR documents (the PDFs themselves are served statically
// from /public/ehr/*.pdf). Used by the records browser / source sidebar.

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ patient: "Alex Rivera", mrn: "00482913", docs: EHR_DOCS });
}
