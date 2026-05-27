// Client-side Google Places (New) integration. Runs entirely in the browser
// with an HTTP-referrer-restricted Maps JS key — no backend or secret needed.
// Uses only the Places API (New) + Maps JavaScript API (no Geocoding API).
//
// Two search modes:
//   • Text   — "coffee shops in West Loop" → up to 20 most prominent results.
//   • Nearby — closest businesses to a GPS point, ranked by DISTANCE. This is
//     how we surface tiny, low-prominence shops with no website ("down the
//     street") that text search buries past result #20.
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
];

// Common categories → Google place types (so Nearby Search can target them).
const TYPE_MAP = {
  "coffee shop": ["coffee_shop", "cafe"],
  coffee: ["coffee_shop", "cafe"],
  cafe: ["cafe", "coffee_shop"],
  barber: ["barber_shop"],
  barbers: ["barber_shop"],
  barbershop: ["barber_shop"],
  "hair salon": ["hair_salon", "beauty_salon"],
  "hair salons": ["hair_salon", "beauty_salon"],
  salon: ["beauty_salon", "hair_salon"],
  "nail salon": ["nail_salon"],
  "nail salons": ["nail_salon"],
  "auto repair": ["car_repair"],
  mechanic: ["car_repair"],
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
  "dry cleaner": ["laundry"],
  "dry cleaners": ["laundry"],
  chiropractor: ["chiropractor"],
  chiropractors: ["chiropractor"],
  "law firm": ["lawyer"],
  "law firms": ["lawyer"],
  lawyer: ["lawyer"],
};

function typesFor(category) {
  return TYPE_MAP[category.trim().toLowerCase()] || null;
}

// ---- public API ----------------------------------------------------------

// Prominence search over a named area. Returns { results, center }.
export async function searchByArea(apiKey, { category, location }) {
  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");
  const textQuery = location ? `${category} in ${location}` : category;
  const { places } = await Place.searchByText({
    textQuery,
    fields: FIELDS,
    maxResultCount: 20,
  });
  const results = (places || []).map(normalize).filter((r) => r.lat != null);
  return { results, center: centroid(results) };
}

// Closest businesses to a GPS point, ranked by distance. Returns { results }.
export async function searchNearMe(apiKey, { category, center, radiusMeters }) {
  await loadMaps(apiKey);
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary(
    "places"
  );
  const types = typesFor(category);

  const request = {
    fields: FIELDS,
    locationRestriction: {
      center: { lat: center.lat, lng: center.lng },
      radius: Math.min(radiusMeters || 3000, 50000),
    },
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
  };
  if (types) request.includedPrimaryTypes = types;

  const { places } = await Place.searchNearby(request);
  let results = (places || []).map(normalize).filter((r) => r.lat != null);

  // If the category wasn't a known type, keep only businesses whose name/type
  // loosely matches what the user typed.
  if (!types) {
    const needle = category.trim().toLowerCase();
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle)
    );
  }
  return { results, center };
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
    status: place.businessStatus || "",
  };
}

function prettyType(t) {
  if (!t) return "";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function centroid(list) {
  if (!list.length) return null;
  const s = list.reduce((a, r) => ({ lat: a.lat + r.lat, lng: a.lng + r.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: s.lat / list.length, lng: s.lng / list.length };
}

// Get the browser's current GPS position.
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
