import {
  Phone,
  MapPin,
  Star,
  Globe,
  Plus,
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { PRESENCE_META } from "../lib/classify";
import { OUTREACH, OUTREACH_META } from "../lib/leadStore";

export default function LeadList({
  leads,
  mode, // "search" | "pipeline"
  savedMap,
  selectedId,
  onSelect,
  onSave,
  onUpdate,
  onRemove,
  emptyHint,
}) {
  if (!leads.length) {
    return (
      <div className="px-8 py-16 text-center text-sm leading-relaxed text-slate-500">
        {emptyHint ||
          (mode === "pipeline"
            ? "No saved leads yet. Save businesses from your search results to start your pipeline."
            : "No results. Try a search above.")}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {leads.map((lead) => {
        const meta = PRESENCE_META[lead.presence];
        const saved = savedMap[lead.placeId];
        const active = lead.placeId === selectedId;
        return (
          <li
            key={lead.placeId}
            onMouseEnter={() => onSelect?.(lead.placeId)}
            className={`px-5 py-4 transition-colors ${
              active ? "bg-brand-50/70" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <h3 className="truncate font-semibold text-slate-900">
                    {lead.name}
                  </h3>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {lead.category && <span>{lead.category}</span>}
                  {lead.rating != null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {lead.rating} ({lead.reviewCount})
                    </span>
                  )}
                </div>

                {lead.address && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {lead.address}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </a>
                  )}
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
                    >
                      <Globe className="h-3 w-3" /> {hostOf(lead.website)}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Globe className="h-3 w-3" /> no website
                    </span>
                  )}
                </div>
              </div>

              {mode === "search" ? (
                <button
                  onClick={() => onSave(lead)}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    saved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {saved ? "Saved" : "Save"}
                </button>
              ) : (
                <button
                  onClick={() => onRemove(lead.placeId)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove from pipeline"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {mode === "pipeline" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={lead.outreach}
                  onChange={(e) => onUpdate(lead.placeId, { outreach: e.target.value })}
                  className={`rounded-lg border-0 px-2.5 py-1 text-xs font-semibold outline-none ${
                    OUTREACH_META[lead.outreach]?.badge || ""
                  }`}
                >
                  {Object.values(OUTREACH).map((s) => (
                    <option key={s} value={s}>
                      {OUTREACH_META[s].label}
                    </option>
                  ))}
                </select>
                <input
                  defaultValue={lead.notes}
                  onBlur={(e) => onUpdate(lead.placeId, { notes: e.target.value })}
                  placeholder="Add a note (saved on blur)…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-brand-400"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
