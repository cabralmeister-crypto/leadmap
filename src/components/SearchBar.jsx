import { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";

const CATEGORY_PRESETS = [
  "Dentists",
  "Hair salons",
  "Auto repair",
  "Restaurants",
  "Plumbers",
  "Chiropractors",
  "Nail salons",
  "Law firms",
];

const RADIUS_OPTIONS = [
  { label: "1 mi", meters: 1609 },
  { label: "2 mi", meters: 3218 },
  { label: "5 mi", meters: 8047 },
  { label: "10 mi", meters: 16093 },
];

export default function SearchBar({ onSearch, busy }) {
  const [category, setCategory] = useState("Dentists");
  const [location, setLocation] = useState("West Loop, Chicago, IL");
  const [radius, setRadius] = useState(3218);

  function submit(e) {
    e.preventDefault();
    if (!category.trim() || !location.trim()) return;
    onSearch({ category: category.trim(), location: location.trim(), radiusMeters: radius });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1.4fr_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Business type (e.g. dentists)"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Neighborhood, city, or ZIP"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r.meters} value={r.meters}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Searching…" : "Find leads"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === c
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </form>
  );
}
