// Decide how strong a business's web presence is from its "website" URL.
// This is the core of LeadMap: businesses with NO site, or only a social /
// auto-generated page, are the warm/hot leads worth pitching.

// Hosts that aren't a "real" business website — a link here = weak presence.
const SOCIAL_HOSTS = [
  "facebook.com",
  "m.facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "linktr.ee",
  "linktree.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "yelp.com",
  "nextdoor.com",
];

// Auto-generated / DIY page builders Google often lists as the "website".
const AUTOGEN_SUFFIXES = [
  ".business.site", // Google Business auto-site
  ".godaddysites.com",
  ".wixsite.com",
  ".square.site",
];
const AUTOGEN_HOSTS = ["g.page", "sites.google.com", "page.link"];

export const PRESENCE = {
  NONE: "none", // no website on file → hottest lead
  SOCIAL: "social", // only a social / auto-generated page → warm lead
  SITE: "site", // has a real website → skip
};

export function classifyPresence(websiteUrl) {
  if (!websiteUrl || !String(websiteUrl).trim()) return PRESENCE.NONE;

  let host;
  try {
    host = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return PRESENCE.NONE; // unparseable → treat as no real site
  }

  if (SOCIAL_HOSTS.includes(host)) return PRESENCE.SOCIAL;
  if (AUTOGEN_HOSTS.includes(host)) return PRESENCE.SOCIAL;
  if (AUTOGEN_SUFFIXES.some((s) => host.endsWith(s))) return PRESENCE.SOCIAL;

  return PRESENCE.SITE;
}

export const PRESENCE_META = {
  [PRESENCE.NONE]: {
    label: "No website",
    short: "No site",
    color: "#ef4444",
    badge: "bg-red-100 text-red-700",
    rank: 0, // sort hottest first
  },
  [PRESENCE.SOCIAL]: {
    label: "Social only",
    short: "Social",
    color: "#f59e0b",
    badge: "bg-amber-100 text-amber-700",
    rank: 1,
  },
  [PRESENCE.SITE]: {
    label: "Has a website",
    short: "Has site",
    color: "#94a3b8",
    badge: "bg-slate-100 text-slate-600",
    rank: 2,
  },
};
