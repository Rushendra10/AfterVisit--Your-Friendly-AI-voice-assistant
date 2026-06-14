// Manifest of the dummy EHR documents (PDFs served from /public/ehr).
export interface EhrDoc {
  file: string;
  label: string;
  pages: number;
  date: string;
}

export const EHR_DOCS: EhrDoc[] = [
  { file: "visit_note.pdf", label: "After-Visit Note", pages: 2, date: "2026-06-12" },
  { file: "labs_a1c.pdf", label: "Lab Results — A1c & Lipids", pages: 2, date: "2026-06-13" },
  { file: "med_list.pdf", label: "Medication List", pages: 1, date: "2026-06-12" },
  { file: "billing.pdf", label: "Estimated Costs", pages: 1, date: "2026-06-12" },
  { file: "problem_list.pdf", label: "Problem List", pages: 1, date: "2026-06-12" },
  { file: "prior_visit_2025.pdf", label: "Annual Physical — 2025", pages: 1, date: "2025-05-10" },
  { file: "prior_visit_2024.pdf", label: "Office Visit — 2024", pages: 1, date: "2024-04-22" },
];

export const labelFor = (file: string) =>
  EHR_DOCS.find((d) => d.file === file)?.label ?? file;
