// Sample results so the app is fully usable before you add a Google API key.
// Centered on Chicago's West Loop. Mix of no-site / social-only / has-site.
import { classifyPresence } from "./classify";

const raw = [
  ["Westside Family Dental", "812 W Randolph St, Chicago, IL", "(312) 555-0142", "", 4.7, 63, "Dentist", 41.8842, -87.6486],
  ["Halsted Hair Studio", "905 W Lake St, Chicago, IL", "(312) 555-0188", "https://www.facebook.com/halstedhair", 4.9, 121, "Hair salon", 41.8856, -87.6512],
  ["Greektown Auto Repair", "330 S Halsted St, Chicago, IL", "(312) 555-0173", "", 4.4, 47, "Auto repair", 41.8761, -87.6473],
  ["La Bella Trattoria", "1042 W Madison St, Chicago, IL", "(312) 555-0119", "https://labellatrattoria.com", 4.6, 410, "Italian restaurant", 41.8817, -87.6535],
  ["Loop Nails & Spa", "120 N Green St, Chicago, IL", "(312) 555-0155", "https://loopnails.business.site", 4.3, 88, "Nail salon", 41.8847, -87.6489],
  ["Madison Street Barbers", "1410 W Madison St, Chicago, IL", "(312) 555-0166", "", 4.8, 204, "Barber shop", 41.8815, -87.6618],
  ["Fulton Market Florals", "923 W Fulton Market, Chicago, IL", "(312) 555-0101", "https://www.instagram.com/fultonflorals", 4.9, 76, "Florist", 41.8866, -87.6513],
  ["Randolph Dry Cleaners", "740 W Randolph St, Chicago, IL", "(312) 555-0134", "", 4.1, 33, "Dry cleaner", 41.8841, -87.6463],
  ["Aoki Sushi Bar", "210 N Carpenter St, Chicago, IL", "(312) 555-0177", "https://aokisushi.com", 4.5, 522, "Sushi restaurant", 41.8858, -87.6533],
  ["West Loop Pet Grooming", "1019 W Lake St, Chicago, IL", "(312) 555-0190", "", 4.7, 59, "Pet groomer", 41.8855, -87.6539],
  ["Skyline Tailoring", "550 W Jackson Blvd, Chicago, IL", "(312) 555-0144", "https://linktr.ee/skylinetailor", 4.6, 41, "Tailor", 41.8781, -87.6406],
  ["Monroe Street Bakery", "1133 W Monroe St, Chicago, IL", "(312) 555-0122", "", 4.8, 167, "Bakery", 41.8803, -87.6558],
];

export const mockResults = raw.map(
  ([name, address, phone, website, rating, reviewCount, category, lat, lng]) => ({
    placeId: "mock-" + name.toLowerCase().replace(/\W+/g, "-"),
    name,
    address,
    phone,
    website,
    presence: classifyPresence(website),
    lat,
    lng,
    rating,
    reviewCount,
    category,
    status: "OPERATIONAL",
  })
);

export const mockCenter = { lat: 41.8836, lng: -87.6505, label: "West Loop, Chicago, IL" };
