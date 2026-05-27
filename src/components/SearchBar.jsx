import { useState } from "react";
import { Search, MapPin, Loader2, LocateFixed } from "lucide-react";

const CATEGORY_PRESETS = [
  "Coffee shops",
  "Barbers",
  "Hair salons",
  "Nail salons",
  "Auto repair",
  "Restaurants",
  "Florists",
  "Dentists",
];

const RADIUS_OPTIONS = [
  { label: "1 mi", meters: 1609 },
  { label: "2 mi", meters: 3218 },
  { label: "5 mi", meters: 8047 },
  { label: "10 mi", meters: 16093 },
];

export default function SearchBar({ onSearch, onNearMe, busy, source, onSourceChange }) {
  const [category, setCategory] = useState(""); // blank = all businesses
  const [location, setLocation] = useState("West Loop, Chicago, IL");
  const [radius, setRadius] = useState(3218);
  const [deep, setDeep] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!location.trim()) return;
    onSearch({ category: category.trim(), location: location.trim(), radiusMeters: radius, deep });
  }

  function nearMe() {
    onNearMe({ category: category.trim(), radiusMeters: radius, deep });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-500">Data source:</span>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => onSourceChange("osm")}
            className={`rounded-md px-3 py-1 font-semibold transition-colors ${
              source === "osm" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
            }`}
          >
            OpenStreetMap · free
          </button>
          <button
            type="button"
            onClick={() => onSourceChange("google")}
            className={`rounded-md px-3 py-1 font-semibold transition-colors ${
              source === "google" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
            }`}
          >
            Google (needs key)
          </button>
        </div>
        <span className="hidden text-slate-400 sm:inline">
          {source === "osm"
            ? "complete coverage, no cap, no key"
            : "accurate websites, ~20/lookup, paid"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_1.4fr_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="All businesses — or narrow (e.g. coffee shops)"
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
          {busy ? "Scanning…" : "Scan area"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={nearMe}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" /> Near me
        </button>
        <span className="mr-1 text-xs text-slate-400">narrow to:</span>
        <button
          type="button"
          onClick={() => setCategory("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            category === ""
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All businesses
        </button>
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

        {source === "google" && (
          <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={deep}
              onChange={(e) => setDeep(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            Deep scan
            <span className="text-slate-400">(more thorough, more lookups)</span>
          </label>
        )}
      </div>
    </form>
  );
}
