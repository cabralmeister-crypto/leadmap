// Persistence for saved leads + outreach pipeline.
//
// Today this uses localStorage so the app works with zero backend setup.
// To move to Base44: create a `Lead` entity in the Base44 dashboard with the
// schema documented in README.md, then swap the bodies below for Base44 SDK
// calls (e.g. `import { Lead } from "@/api/entities"` → Lead.list(), Lead.create(),
// Lead.update(id, ...)). The component API here stays the same.

const KEY = "leadmap.savedLeads.v1";

export const OUTREACH = {
  NEW: "new",
  CONTACTED: "contacted",
  INTERESTED: "interested",
  SOLD: "sold",
  NOT_INTERESTED: "not_interested",
};

export const OUTREACH_META = {
  [OUTREACH.NEW]: { label: "New", badge: "bg-brand-100 text-brand-700" },
  [OUTREACH.CONTACTED]: { label: "Contacted", badge: "bg-sky-100 text-sky-700" },
  [OUTREACH.INTERESTED]: { label: "Interested", badge: "bg-violet-100 text-violet-700" },
  [OUTREACH.SOLD]: { label: "Sold ✓", badge: "bg-emerald-100 text-emerald-700" },
  [OUTREACH.NOT_INTERESTED]: { label: "Not interested", badge: "bg-slate-200 text-slate-500" },
};

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function write(map) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

// Returns a map of placeId -> saved lead record.
export function getSavedMap() {
  return read();
}

export function getSavedList() {
  return Object.values(read()).sort(
    (a, b) => (b.savedAt || 0) - (a.savedAt || 0)
  );
}

// Save (or refresh) a lead found in search. Keeps existing outreach/notes.
export function saveLead(lead) {
  const map = read();
  const existing = map[lead.placeId];
  map[lead.placeId] = {
    ...lead,
    outreach: existing?.outreach || OUTREACH.NEW,
    notes: existing?.notes || "",
    savedAt: existing?.savedAt || Date.now(),
  };
  write(map);
  return map[lead.placeId];
}

export function updateLead(placeId, patch) {
  const map = read();
  if (!map[placeId]) return null;
  map[placeId] = { ...map[placeId], ...patch };
  write(map);
  return map[placeId];
}

export function removeLead(placeId) {
  const map = read();
  delete map[placeId];
  write(map);
}

export function isSaved(placeId) {
  return !!read()[placeId];
}
