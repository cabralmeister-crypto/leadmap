// Client-side Google Places (New) integration. Runs entirely in the browser
// with an HTTP-referrer-restricted Maps JS key — no backend or secret needed.
import { classifyPresence } from "./classify";

let mapsPromise = null;

// Load the Google Maps JS API (with Places library) once.
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

// Turn a location string ("West Loop, Chicago") into a center point.
export async function geocode(apiKey, query) {
  await loadMaps(apiKey);
  const { Geocoder } = await google.maps.importLibrary("geocoding");
  const geocoder = new Geocoder();
  const { results } = await geocoder.geocode({ address: query });
  if (!results?.length) throw new Error(`Couldn't find "${query}".`);
  const loc = results[0].geometry.location;
  return { lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address };
}

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "nationalPhoneNumber",
  "websiteURI",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "businessStatus",
];

// Search businesses by free-text category, biased to a center + radius.
export async function searchBusinesses(apiKey, { category, center, radiusMeters }) {
  await loadMaps(apiKey);
  const { Place } = await google.maps.importLibrary("places");

  const { places } = await Place.searchByText({
    textQuery: category,
    fields: FIELDS,
    maxResultCount: 20,
    locationBias: {
      center: { lat: center.lat, lng: center.lng },
      radius: radiusMeters,
    },
  });

  return (places || []).map(normalize);
}

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
    category: place.primaryTypeDisplayName || "",
    status: place.businessStatus || "",
  };
}
