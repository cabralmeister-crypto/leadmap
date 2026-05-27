// Client-side Google Places (New) integration. Runs entirely in the browser
// with an HTTP-referrer-restricted Maps JS key — no backend or secret needed.
// Uses only the Places API (New) + Maps JavaScript API (no Geocoding API).
//
// To find EVERY business in an area (not just Google's top 20 most prominent),
// we tile the area into a grid and run a distance-ranked Nearby Search in each
// cell, then merge + dedupe. This surfaces the low-prominence, no-website shops
// that a single search buries.
import { classifyPresence } from "./classify";

let mapsPromise = null;

export function loadMaps(apiKey) {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&libraries=places&v=weekly&loading=async";
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () =>
      reject(new Error("Could not load Google Maps — check your API key / referrer restrictions."));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

const FIELDS = [
  "displayName",
  "formattedAddress",
  "location",
  "nationalPhoneNumber",
  "websiteURI",
  "rating",
  "userRatingCount",
  "businessStatus",
  "primaryType",
  "types",
];

// Place types that aren't sellable businesses — parks, restrooms, transit,
// ATMs, worship, schools, government, etc. Filtered out of "all business" scans.
const NON_BUSINESS_TYPES = new Set([
  "park", "dog_park", "national_park", "state_park", "hiking_area", "beach",
  "marina", "campground", "camping_cabin", "garden", "plaza", "playground",
  "public_bathroom", "rest_stop", "toilet",
  "bus_station", "bus_stop", "train_station", "subway_station", "transit_station",
  "transit_depot", "light_rail_station", "ferry_terminal", "parking",
  "airport", "international_airport", "heliport",
  "atm",
  "church", "hindu_temple", "mosque", "synagogue", "place_of_worship",
  "school", "primary_school", "secondary_school", "preschool", "university",
  "city_hall", "courthouse", "embassy", "fire_station", "police", "post_office",
  "local_government_office", "government_office",
  "cemetery", "funeral_home",
  "monument", "historical_landmark", "tourist_attraction",
  "hospital",
]);

// A result counts as a sellable business if its type isn't on the denylist and
// it shows some commercial signal (a phone, a website, or customer reviews).
function isSellableBusiness(r) {
  const types = [r.primaryType, ...(r.types || [])].filter(Boolean);
  if (types.some((t) => NON_BUSINESS_TYPES.has(t))) return false;
  const hasSignal = r.phone || r.website || (r.reviewCount || 0) > 0;
  return hasSignal;
}

// Optional: narrow a scan to a category by mapping it to Google place types.
const TYPE_MAP = {
  "coffee shop": ["coffee_shop", "cafe"],
  "coffee shops": ["coffee_shop", "cafe"],
  cafe: ["cafe", "coffee_shop"],
  barber: ["barber_shop"],
  barbers: ["barber_shop"],
  "hair salon": ["hair_salon", "beauty_salon"],
  "hair salons": ["hair_salon", "beauty_salon"],
  "nail salon": ["nail_salon"],
  "nail salons": ["nail_salon"],
  "auto repair": ["car_repair"],
  restaurant: ["restaurant"],
  restaurants: ["restaurant"],
  dentist: ["dentist"],
  dentists: ["dentist"],
  plumber: ["plumber"],
  plumbers: ["plumber"],
  florist: ["florist"],
  florists: ["florist"],
  bakery: ["bakery"],
  bakeries: ["bakery"],
  chiropractor: ["chiropractor"],
  chiropractors: ["chiropractor"],
};

function typesFor(category) {
  if (!category) return null;
  return TYPE_MAP[category.trim().toLowerCase()] || null;
}

// ---- public API ----------------------------------------------------------

// Resolve a typed area ("West Loop, Chicago") to a center point — via Places
// text search, so we don't need the separate Geocoding API.
export async function findAreaCenter(apiKey, location) {
  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: location,
    fields: ["location"],
    maxResultCount: 1,
  });
  const p = places?.[0];
  if (!p?.location) throw new Error(`Couldn't locate "${location}".`);
  return { lat: p.location.lat(), lng: p.location.lng() };
}

// Sweep an area for ALL businesses (or one category). Returns { results, center }.
// onProgress(done, total, found) fires as each grid cell completes.
export async function scanArea(
  apiKey,
  { center, radiusMeters, category, deep, onProgress }
) {
  await loadMaps(apiKey);
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary(
    "places"
  );
  const types = typesFor(category);
  const { points, tileRadius } = buildGrid(center, radiusMeters, deep);

  const seen = new Map();
  let done = 0;
  let failed = 0;
  let lastError = null;

  const runCell = async (pt) => {
    const request = {
      fields: FIELDS,
      locationRestriction: { center: pt, radius: tileRadius },
      maxResultCount: 20,
      rankPreference: SearchNearbyRankPreference.DISTANCE,
    };
    if (types) request.includedPrimaryTypes = types;
    try {
      const { places } = await Place.searchNearby(request);
      (places || []).forEach((p) => {
        if (p?.id && !seen.has(p.id)) seen.set(p.id, normalize(p));
      });
    } catch (e) {
      failed += 1;
      lastError = e;
    } finally {
      done += 1;
      onProgress?.(done, points.length, seen.size);
    }
  };

  // Run in small parallel batches to stay quick without hammering quota.
  const BATCH = 4;
  for (let i = 0; i < points.length; i += BATCH) {
    await Promise.all(points.slice(i, i + BATCH).map(runCell));
  }

  // If every lookup failed, that's a config problem (key/API), not an empty
  // area — surface the real Google error instead of "no businesses found".
  if (failed === points.length && lastError) {
    throw new Error(
      "Google rejected the search: " +
        (lastError.message || lastError) +
        " — check that Places API (New) is enabled and your key allows this site."
    );
  }

  let results = [...seen.values()].filter(
    (r) =>
      r.lat != null &&
      (!r.status || r.status === "OPERATIONAL") &&
      isSellableBusiness(r)
  );

  // If a category was typed but isn't in our type map, match it loosely.
  if (!types && category && category.trim()) {
    const needle = category.trim().toLowerCase();
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle)
    );
  }
  return { results, center };
}

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("This device doesn't support location."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        reject(
          new Error("Couldn't get your location — allow location access and try again.")
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ---- helpers -------------------------------------------------------------

function normalize(place) {
  const website = place.websiteURI || "";
  return {
    placeId: place.id,
    name: place.displayName || "(unnamed)",
    address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber || "",
    website,
    presence: classifyPresence(website),
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    category: prettyType(place.primaryType),
    primaryType: place.primaryType || "",
    types: place.types || [],
    status: place.businessStatus || "",
  };
}

function prettyType(t) {
  if (!t) return "";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build a grid of scan points covering a circle, clipped to that circle.
// Cells fully overlap (tileRadius ≥ half the cell diagonal) so coverage is
// continuous — no gaps that make results look "gridded". Denser for tighter
// radii where comprehensive coverage matters most; capped to bound API cost.
function buildGrid(center, radiusMeters, deep) {
  const R = Math.min(radiusMeters || 1609, 16000);
  // Deep scan packs in far more, smaller tiles so each one stays under Google's
  // 20-result cap — that's what dissolves the lat/long grid into real coverage.
  const N = deep
    ? Math.max(8, Math.min(12, Math.round((2 * R) / 300)))
    : R <= 1200
      ? 5
      : 6;
  const step = (2 * R) / N;
  const tileRadius = Math.round(step * 0.75); // ≥ step/√2 → cells overlap, no gaps

  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);

  const points = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const dx = -R + step * (i + 0.5);
      const dy = -R + step * (j + 0.5);
      if (Math.hypot(dx, dy) > R) continue; // clip to circle
      points.push({
        lat: center.lat + dy / mPerDegLat,
        lng: center.lng + dx / mPerDegLng,
      });
    }
  }
  return { points, tileRadius };
}
