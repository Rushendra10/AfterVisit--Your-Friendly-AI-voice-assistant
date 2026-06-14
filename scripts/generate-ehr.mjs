// Generates the dummy /EHR corpus for the "Aftervisit" demo.
//   - Real PDFs  -> public/ehr/*.pdf        (shown in the source sidebar)
//   - Plain text -> data/ehr/*.txt          (read by /api/reason for live grounding)
//   - Combined   -> data/ehr/corpus.txt     (single file for the reasoning prompt)
//
// Patient: Alex Rivera, 41, newly diagnosed Type 2 Diabetes (fabricated, demo-only).
// Run with: npm run gen:ehr   (node scripts/generate-ehr.mjs)

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PDF_DIR = path.join(ROOT, "public", "ehr");
const TXT_DIR = path.join(ROOT, "data", "ehr");

fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(TXT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Document content. Each doc is defined ONCE and rendered to both PDF + text,
// so citation quotes (used by the UI + reasoning) always match the rendered text.
// A block = { s: style, t: text }. styles: h1, h2, label, body, bullet, hr, sp
// ---------------------------------------------------------------------------

/** @type {{file:string,title:string,pages:{s:string,t?:string}[][]}[]} */
const DOCS = [
  {
    file: "visit_note.pdf",
    title: "After-Visit Clinical Note",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "After-Visit Clinical Note" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        DOB: 03/14/1985 (Age 41)        Sex: M" },
        { s: "label", t: "MRN: 00482913        Date of Service: 2026-06-12        Provider: Sarah Lee, MD" },
        { s: "sp" },
        { s: "h2", t: "Chief Complaint" },
        { s: "body", t: "Fatigue, increased thirst, and intermittent blurred vision for approximately 6 weeks." },
        { s: "h2", t: "History of Present Illness" },
        { s: "body", t: "41-year-old male presents with a 6-week history of fatigue, polydipsia, polyuria, and intermittent blurred vision. Reports increased nocturia (2-3x/night) and unintentional 6 lb weight loss. No chest pain, no focal neuro deficits. Family history significant for type 2 diabetes (father)." },
        { s: "h2", t: "Vitals" },
        { s: "body", t: "BP 138/86 mmHg   HR 78   Temp 98.4F   BMI 31.2 kg/m2" },
        { s: "h2", t: "Assessment" },
        { s: "bullet", t: "1. Type 2 Diabetes Mellitus, newly diagnosed (E11.9). HbA1c 7.8%." },
        { s: "bullet", t: "2. Essential hypertension (I10)." },
        { s: "bullet", t: "3. Mixed hyperlipidemia (E78.2)." },
        { s: "h2", t: "Plan" },
        { s: "bullet", t: "Initiate metformin 500 mg PO BID with meals; titrate to 1000 mg BID over 4 weeks as tolerated." },
        { s: "bullet", t: "Medical nutrition therapy; >=150 min/week moderate-intensity physical activity." },
        { s: "bullet", t: "Referral to ophthalmology for dilated diabetic retinopathy screening." },
        { s: "bullet", t: "Order urine albumin-to-creatinine ratio (microalbuminuria screen)." },
        { s: "bullet", t: "Repeat HbA1c in 3 months. Continue lisinopril 10 mg daily." },
        { s: "bullet", t: "Follow-up appointment in 3 months, or sooner as needed." },
      ],
      [
        { s: "h2", t: "Patient Instructions" },
        { s: "body", t: "You have been diagnosed with type 2 diabetes. This means your blood sugar (glucose) is higher than the normal range. Your HbA1c, a 3-month average of your blood sugar, is 7.8% (a value of 6.5% or higher indicates diabetes)." },
        { s: "body", t: "Start metformin as directed with food to reduce stomach upset. Pick up your prescription at your pharmacy. Take your medication daily." },
        { s: "h2", t: "When to Seek Care" },
        { s: "bullet", t: "Symptoms of low blood sugar: shakiness, sweating, confusion, rapid heartbeat." },
        { s: "bullet", t: "Persistent vomiting, very high blood sugar, or vision changes that worsen." },
        { s: "sp" },
        { s: "label", t: "Electronically signed by Sarah Lee, MD on 2026-06-12 18:42" },
      ],
    ],
  },
  {
    file: "labs_a1c.pdf",
    title: "Laboratory Results",
    pages: [
      [
        { s: "h1", t: "Riverside Laboratory" },
        { s: "h2", t: "Laboratory Results" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        MRN: 00482913" },
        { s: "label", t: "Collected: 2026-06-12        Resulted: 2026-06-13        Ordering Provider: Sarah Lee, MD" },
        { s: "sp" },
        { s: "h2", t: "Diabetes Panel" },
        { s: "bullet", t: "Hemoglobin A1c: 7.8 %  (H)   Reference: <5.7 normal; 5.7-6.4 prediabetes; >=6.5 diabetes" },
        { s: "bullet", t: "Estimated Average Glucose (eAG): 177 mg/dL" },
        { s: "bullet", t: "Fasting Plasma Glucose: 152 mg/dL  (H)   Reference: 70-99 mg/dL" },
        { s: "sp" },
        { s: "body", t: "Interpretation: Results are consistent with type 2 diabetes mellitus. HbA1c of 7.8% is above the diagnostic threshold of 6.5%." },
      ],
      [
        { s: "h2", t: "Lipid Panel" },
        { s: "bullet", t: "Total Cholesterol: 222 mg/dL  (H)   Reference: <200" },
        { s: "bullet", t: "LDL Cholesterol: 138 mg/dL  (H)   Reference: <100" },
        { s: "bullet", t: "HDL Cholesterol: 41 mg/dL  (L)   Reference: >40" },
        { s: "bullet", t: "Triglycerides: 180 mg/dL  (H)   Reference: <150" },
        { s: "h2", t: "Comprehensive Metabolic Panel (selected)" },
        { s: "bullet", t: "Creatinine: 0.9 mg/dL   eGFR: 92 mL/min/1.73m2 (normal renal function)" },
        { s: "bullet", t: "Potassium: 4.2 mmol/L   Sodium: 139 mmol/L" },
      ],
    ],
  },
  {
    file: "med_list.pdf",
    title: "Medication List",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "Active Medication List" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        MRN: 00482913        Updated: 2026-06-12" },
        { s: "sp" },
        { s: "bullet", t: "metformin 500 mg tablet - take 1 tablet by mouth twice daily with meals. STATUS: NEW (2026-06-12), prescribed by Sarah Lee, MD." },
        { s: "bullet", t: "lisinopril 10 mg tablet - take 1 tablet by mouth once daily. STATUS: Active since 2024 (hypertension)." },
        { s: "sp" },
        { s: "h2", t: "Allergies" },
        { s: "bullet", t: "Penicillin - documented reaction: rash (recorded 2019)." },
        { s: "body", t: "Note: Patient has previously stated this allergy may be inaccurate." },
      ],
    ],
  },
  {
    file: "billing.pdf",
    title: "Estimated Costs",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "Estimated Costs - This Visit & Plan" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        MRN: 00482913        Plan: BlueCross PPO" },
        { s: "sp" },
        { s: "h2", t: "Estimated Out-of-Pocket" },
        { s: "bullet", t: "Office visit today (established patient) - copay: $30 after insurance." },
        { s: "bullet", t: "Metformin 500 mg (generic), 90-day supply - about $12 at CVS with your plan." },
        { s: "bullet", t: "Lab work (HbA1c + lipid panel) - about $25 after insurance." },
        { s: "bullet", t: "Diabetic eye exam (ophthalmology referral) - about $40 copay." },
        { s: "sp" },
        { s: "bullet", t: "Estimated total out-of-pocket this month: about $107." },
        { s: "body", t: "Actual amounts vary by plan and deductible status. Generic savings and financial-assistance programs are available - ask the front desk." },
      ],
    ],
  },
  {
    file: "problem_list.pdf",
    title: "Problem List",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "Active Problem List" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        MRN: 00482913" },
        { s: "sp" },
        { s: "bullet", t: "1. Type 2 Diabetes Mellitus (E11.9) - onset 2026-06-12." },
        { s: "bullet", t: "2. Essential Hypertension (I10) - onset 2023." },
        { s: "bullet", t: "3. Mixed Hyperlipidemia (E78.2) - onset 2024." },
        { s: "sp" },
        { s: "h2", t: "Allergies" },
        { s: "bullet", t: "Penicillin - recorded 2019 (rash). Patient disputes this allergy." },
      ],
    ],
  },
  {
    file: "prior_visit_2025.pdf",
    title: "Prior Visit - Annual Physical 2025",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "Annual Physical - Prior Visit" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        Date of Service: 2025-05-10        Provider: Sarah Lee, MD" },
        { s: "sp" },
        { s: "bullet", t: "Fasting Plasma Glucose: 110 mg/dL (impaired fasting glucose / prediabetes range)." },
        { s: "bullet", t: "Hemoglobin A1c: 6.0 % (prediabetes range: 5.7-6.4)." },
        { s: "bullet", t: "BMI 30.1 kg/m2. BP 134/84." },
        { s: "body", t: "Assessment: Prediabetes. Plan: Counseled on lifestyle modification, diet, and exercise. Recheck in 1 year." },
      ],
    ],
  },
  {
    file: "prior_visit_2024.pdf",
    title: "Prior Visit 2024",
    pages: [
      [
        { s: "h1", t: "Riverside Family Medicine" },
        { s: "h2", t: "Office Visit - Prior Visit" },
        { s: "hr" },
        { s: "label", t: "Patient: Alex Rivera        Date of Service: 2024-04-22        Provider: Sarah Lee, MD" },
        { s: "sp" },
        { s: "bullet", t: "Fasting Plasma Glucose: 102 mg/dL." },
        { s: "bullet", t: "BP 142/90 mmHg (elevated). Started lisinopril 10 mg daily for hypertension." },
        { s: "body", t: "Assessment: Essential hypertension, newly treated. Borderline fasting glucose; monitor." },
      ],
    ],
  },
];

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------
const STYLE = {
  h1: { font: "Helvetica-Bold", size: 18, gap: 4, color: "#0f3d3e" },
  h2: { font: "Helvetica-Bold", size: 12.5, gap: 3, color: "#155e63" },
  label: { font: "Helvetica", size: 9.5, gap: 2, color: "#444444" },
  body: { font: "Helvetica", size: 10.5, gap: 4, color: "#111111" },
  bullet: { font: "Helvetica", size: 10.5, gap: 4, color: "#111111" },
};

function renderPdf(doc) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "LETTER", margin: 54 });
    const out = fs.createWriteStream(path.join(PDF_DIR, doc.file));
    out.on("finish", resolve);
    out.on("error", reject);
    pdf.pipe(out);

    doc.pages.forEach((blocks, pageIdx) => {
      if (pageIdx > 0) pdf.addPage();
      for (const b of blocks) {
        if (b.s === "sp") { pdf.moveDown(0.6); continue; }
        if (b.s === "hr") {
          pdf.moveDown(0.3);
          pdf.strokeColor("#cccccc").lineWidth(1)
            .moveTo(54, pdf.y).lineTo(558, pdf.y).stroke();
          pdf.moveDown(0.5);
          continue;
        }
        const st = STYLE[b.s] || STYLE.body;
        pdf.font(st.font).fontSize(st.size).fillColor(st.color);
        const text = b.s === "bullet" ? b.t : b.t;
        pdf.text(text, { indent: b.s === "bullet" ? 12 : 0, align: "left", lineGap: 1.5 });
        pdf.moveDown(st.gap / 10);
      }
      // footer: page number
      pdf.font("Helvetica").fontSize(8).fillColor("#888888");
      pdf.text(
        `Alex Rivera | MRN 00482913 | Page ${pageIdx + 1} of ${doc.pages.length}`,
        54, 740, { align: "center", width: 504 }
      );
    });

    pdf.end();
  });
}

// ---------------------------------------------------------------------------
// Text rendering (for grounding). Page markers let citations reference pages.
// ---------------------------------------------------------------------------
function renderText(doc) {
  const lines = [`=== FILE: ${doc.file} (${doc.title}) ===`];
  doc.pages.forEach((blocks, i) => {
    lines.push(`--- Page ${i + 1} ---`);
    for (const b of blocks) {
      if (b.s === "sp" || b.s === "hr") continue;
      lines.push(b.t);
    }
    lines.push("");
  });
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
async function main() {
  const corpusParts = [];
  for (const doc of DOCS) {
    await renderPdf(doc);
    const txt = renderText(doc);
    const base = doc.file.replace(/\.pdf$/, ".txt");
    fs.writeFileSync(path.join(TXT_DIR, base), txt, "utf8");
    corpusParts.push(txt);
    console.log(`  generated ${doc.file} (${doc.pages.length}p) + ${base}`);
  }
  fs.writeFileSync(path.join(TXT_DIR, "corpus.txt"), corpusParts.join("\n\n"), "utf8");

  // structured blocks for in-app HTML rendering (highlight + pointer)
  const docsJson = {};
  for (const doc of DOCS) docsJson[doc.file] = { label: doc.title, pages: doc.pages };
  fs.writeFileSync(path.join(TXT_DIR, "docs.json"), JSON.stringify(docsJson, null, 2), "utf8");

  console.log(`\nDone. ${DOCS.length} documents -> public/ehr/*.pdf + data/ehr/*.txt + corpus.txt + docs.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
