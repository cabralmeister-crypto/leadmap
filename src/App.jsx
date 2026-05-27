import { useEffect, useMemo, useState } from "react";
import {
  MapPinned,
  KeyRound,
  Download,
  Filter,
  AlertCircle,
  FlaskConical,
  X,
} from "lucide-react";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import LeadList from "./components/LeadList";
import { searchBusinesses } from "./lib/places";
import { mockResults, mockCenter } from "./lib/mock";
import { PRESENCE, PRESENCE_META } from "./lib/classify";
import {
  getSavedMap,
  saveLead,
  updateLead,
  removeLead,
  getSavedList,
  OUTREACH,
} from "./lib/leadStore";
import { exportLeadsCsv } from "./lib/csv";

const KEY_STORE = "leadmap.googleApiKey";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORE) || "");
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  const [center, setCenter] = useState(null);
  const [results, setResults] = useState([]);
  const [savedMap, setSavedMap] = useState(() => getSavedMap());
  const [view, setView] = useState("results"); // results | pipeline
  const [weakOnly, setWeakOnly] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);

  const demoMode = !apiKey;

  // Preview sample data on first load (until a real key + search is used).
  useEffect(() => {
    if (demoMode) {
      setCenter(mockCenter);
      setResults(mockResults);
      setDemo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshSaved() {
    setSavedMap(getSavedMap());
  }

  async function handleSearch({ category, location, radiusMeters }) {
    setError("");
    setBusy(true);
    try {
      if (demoMode) {
        // No key yet — load sample data so the workflow is usable.
        setCenter(mockCenter);
        setResults(mockResults);
        setDemo(true);
        setView("results");
      } else {
        const { results: found, center: c } = await searchBusinesses(apiKey, {
          category,
          location,
          radiusMeters,
        });
        setCenter(c);
        setResults(found);
        setDemo(false);
        setView("results");
        if (!found.length)
          setError("No businesses found there. Try a wider radius or different terms.");
      }
    } catch (e) {
      setError(e.message || "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleSave(lead) {
    saveLead(lead);
    refreshSaved();
  }
  function handleUpdate(placeId, patch) {
    updateLead(placeId, patch);
    refreshSaved();
  }
  function handleRemove(placeId) {
    removeLead(placeId);
    refreshSaved();
  }

  function saveKey() {
    const k = keyDraft.trim();
    localStorage.setItem(KEY_STORE, k);
    setApiKey(k);
    setShowKeyPanel(false);
  }

  // ---- derived lists ----
  const pipeline = useMemo(() => getSavedList(), [savedMap]);
  const baseList = view === "pipeline" ? pipeline : results;

  const visibleLeads = useMemo(() => {
    let list = baseList;
    if (weakOnly) list = list.filter((l) => l.presence !== PRESENCE.SITE);
    return [...list].sort((a, b) => {
      const r = PRESENCE_META[a.presence].rank - PRESENCE_META[b.presence].rank;
      return r !== 0 ? r : (b.rating || 0) - (a.rating || 0);
    });
  }, [baseList, weakOnly]);

  const stats = useMemo(() => {
    const s = { [PRESENCE.NONE]: 0, [PRESENCE.SOCIAL]: 0, [PRESENCE.SITE]: 0 };
    results.forEach((l) => (s[l.presence] += 1));
    return s;
  }, [results]);

  const soldCount = pipeline.filter((l) => l.outreach === OUTREACH.SOLD).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <MapPinned className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                LeadMap
              </h1>
              <p className="text-xs text-slate-500">
                Find businesses with no web presence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {demoMode ? (
              <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 sm:inline-flex">
                <FlaskConical className="h-3.5 w-3.5" /> Demo data
              </span>
            ) : (
              <span className="hidden items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                ● Live (Google)
              </span>
            )}
            <button
              onClick={() => {
                setKeyDraft(apiKey);
                setShowKeyPanel((v) => !v);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {apiKey ? "API key" : "Add API key"}
            </button>
          </div>
        </div>

        {showKeyPanel && (
          <div className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-7xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Google Maps API key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      placeholder="AIza…"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={saveKey}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Save
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Enable <b>Maps JavaScript API</b> + <b>Places API (New)</b>,
                    restrict the key to your domains, and paste it here. Stored
                    only in your browser. Without a key, LeadMap runs on sample data.
                  </p>
                </div>
                <button
                  onClick={() => setShowKeyPanel(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <SearchBar onSearch={handleSearch} busy={busy} />

        {demo && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <FlaskConical className="h-4 w-4 shrink-0" />
            Showing <b>sample West Loop data</b>. Add your Google API key (top
            right) to search any real area live.
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Businesses found" value={results.length} color="#4f46e5" />
          <StatCard label="No website" value={stats[PRESENCE.NONE]} color="#ef4444" />
          <StatCard label="Social only" value={stats[PRESENCE.SOCIAL]} color="#f59e0b" />
          <StatCard
            label={`In pipeline · ${soldCount} sold`}
            value={pipeline.length}
            color="#10b981"
          />
        </div>

        {/* Tabs + actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <TabBtn active={view === "results"} onClick={() => setView("results")}>
              Search results ({results.length})
            </TabBtn>
            <TabBtn active={view === "pipeline"} onClick={() => setView("pipeline")}>
              My pipeline ({pipeline.length})
            </TabBtn>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeakOnly((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                weakOnly
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {weakOnly ? "Weak presence only" : "Showing all"}
            </button>
            <button
              onClick={() =>
                exportLeadsCsv(
                  visibleLeads,
                  view === "pipeline" ? "leadmap-pipeline.csv" : "leadmap-results.csv"
                )
              }
              disabled={!visibleLeads.length}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* List + map */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="max-h-[72vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <LeadList
              leads={visibleLeads}
              mode={view === "pipeline" ? "pipeline" : "search"}
              savedMap={savedMap}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSave={handleSave}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </div>
          <div className="h-[72vh] overflow-hidden rounded-2xl border border-slate-200 shadow-card">
            <MapView
              center={center}
              leads={visibleLeads}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
