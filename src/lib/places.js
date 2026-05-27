// Client-side Google Places (New) integration. Runs entirely in the browser
// with an HTTP-referrer-restricted Maps JS key — no backend or secret needed.
// Uses ONLY the Places API (New) + Maps JavaScript API (no Geocoding API):
// the location is folded into the text query and the map center is derived
// from the results, so there are fewer APIs to enable and fewer ways to break.
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

// Search businesses by category within a named area. Returns { results, center }.
export async function searchBusinesses(apiKey, { category, location, radiusMeters }) {
  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");

  const textQuery = location ? `${category} in ${location}` : category;
  const { places } = await Place.searchByText({
    textQuery,
    fields: FIELDS,
    maxResultCount: 20,
  });

  let results = (places || []).map(normalize).filter((r) => r.lat != null);
  const center = centroid(results);

  // Keep results within the chosen radius of the result cluster's center.
  if (center && radiusMeters) {
    results = results.filter((r) => metersBetween(center, r) <= radiusMeters);
  }
  return { results, center };
}

function normalize(place) {
  const website = place.websiteURI || "";
  return {
    placeId: place.id, // always present on a Place, no need to request it
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
  const sum = list.reduce((a, r) => ({ lat: a.lat + r.lat, lng: a.lng + r.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / list.length, lng: sum.lng / list.length };
}

function metersBetween(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
