// Free business data from OpenStreetMap via the Overpass API. No API key and
// NO result cap — one query returns every mapped business in the area at its
// real location, so there's no tiling and no grid artifact. Website accuracy is
// only as good as OSM's tags, so Google can be layered on for verification.
import { classifyPresence } from "./classify";

// CORS-enabled Overpass mirrors (the main overpass-api.de blocks cross-origin
// browser requests, so it's last). Tried in order until one responds.
const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// amenity= values that aren't sellable businesses.
const NON_BUSINESS_AMENITIES = new Set([
  "parking", "parking_space", "parking_entrance", "bicycle_parking", "bench",
  "waste_basket", "waste_disposal", "toilets", "fountain", "drinking_water",
  "charging_station", "atm", "place_of_worship", "school", "university",
  "college", "kindergarten", "library", "townhall", "courthouse", "police",
  "fire_station", "post_box", "recycling", "shelter", "hospital", "grave_yard",
  "community_centre", "public_bookcase", "bbq", "shower", "clock", "telephone",
  "vending_machine", "fuel", "bicycle_rental", "car_sharing", "taxi",
]);

function radiusToBbox(center, radiusMeters) {
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    s: center.lat - dLat,
    w: center.lng - dLng,
    n: center.lat + dLat,
    e: center.lng + dLng,
  };
}

// Free geocoding via Nominatim (no key) for the OSM path.
export async function geocodeOSM(location) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(location);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Location lookup failed.");
  const arr = await res.json();
  if (!arr.length) throw new Error(`Couldn't find "${location}".`);
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

export async function scanOSM({ center, radiusMeters, category, onProgress }) {
  const { s, w, n, e } = radiusToBbox(center, Math.min(radiusMeters || 1609, 16000));
  const bbox = `${s},${w},${n},${e}`;
  const q = `[out:json][timeout:50];
(
  nwr["name"]["shop"](${bbox});
  nwr["name"]["amenity"](${bbox});
  nwr["name"]["office"](${bbox});
  nwr["name"]["craft"](${bbox});
);
out tags center;`;

  onProgress?.(0, 1, 0);

  let data = null;
  let lastErr = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      });
      if (!res.ok) throw new Error("OpenStreetMap server returned " + res.status);
      data = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!data) throw new Error("OpenStreetMap query failed: " + (lastErr?.message || "unknown"));

  const cat = (category || "").trim().toLowerCase();
  const seen = new Map();

  for (const el of data.elements || []) {
    const t = el.tags || {};
    if (!t.name) continue;
    if (t.amenity && NON_BUSINESS_AMENITIES.has(t.amenity)) continue;
    if (!t.shop && !t.office && !t.craft && !t.amenity) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    const kind = humanize(t.shop || t.craft || t.office || t.amenity);

    // Optional category narrowing (matches the typed term loosely).
    if (cat && !(`${t.name} ${kind}`.toLowerCase().includes(cat))) continue;

    const website = t.website || t["contact:website"] || t.url || "";
    const key = `osm-${el.type}-${el.id}`;
    seen.set(key, {
      placeId: key,
      name: t.name,
      address: osmAddress(t),
      phone: t.phone || t["contact:phone"] || t["contact:mobile"] || "",
      website,
      presence: classifyPresence(website),
      lat,
      lng,
      rating: null,
      reviewCount: 0,
      category: kind,
      status: "OPERATIONAL",
    });
  }

  const results = [...seen.values()];
  onProgress?.(1, 1, results.length);
  return { results, center };
}

function osmAddress(t) {
  const line = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const city = [t["addr:city"], t["addr:state"]].filter(Boolean).join(", ");
  return [line, city, t["addr:postcode"]].filter(Boolean).join(", ");
}

function humanize(v) {
  return v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}
