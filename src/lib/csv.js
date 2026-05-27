import { PRESENCE_META } from "./classify";
import { OUTREACH_META } from "./leadStore";

const COLUMNS = [
  ["Business", (l) => l.name],
  ["Web presence", (l) => PRESENCE_META[l.presence]?.label || ""],
  ["Phone", (l) => l.phone],
  ["Address", (l) => l.address],
  ["Website", (l) => l.website],
  ["Rating", (l) => (l.rating != null ? l.rating : "")],
  ["Reviews", (l) => l.reviewCount ?? ""],
  ["Category", (l) => l.category],
  ["Outreach", (l) => OUTREACH_META[l.outreach]?.label || ""],
  ["Notes", (l) => l.notes || ""],
];

function esc(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportLeadsCsv(leads, filename = "leadmap-leads.csv") {
  const header = COLUMNS.map((c) => c[0]).join(",");
  const rows = leads.map((l) => COLUMNS.map(([, fn]) => esc(fn(l))).join(","));
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
