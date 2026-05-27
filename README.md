# LeadMap

Find local businesses with **no website** or only a **weak online presence**
(dead Facebook page, auto-generated Google site), map them, and track your
sales outreach. Built to sell web + social services to the businesses that need
them most — pitch them *before* a competitor does.

## What it does

1. Search a business type + area (e.g. "dentists near West Loop, Chicago")
2. Pulls every matching business from Google Places
3. Classifies each one's web presence:
   - 🔴 **No website** — hottest lead
   - 🟡 **Social only** — Facebook/Instagram/Linktree/`*.business.site` only
   - ⚪ **Has a real website** — skip (hidden by default)
4. Maps them with colored pins + a sortable lead list (phone, address, rating)
5. **Save leads** into a pipeline and track status: New → Contacted →
   Interested → Sold
6. **Export to CSV** for your call list

Runs on **sample data out of the box** — add a Google API key to go live.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Going live: Google Maps API key

The data comes from Google Places, called client-side (no backend needed).

1. **console.cloud.google.com** → create a project
2. Enable **billing** (required even within the free monthly tier)
3. **APIs & Services → Library** → enable **Maps JavaScript API** and
   **Places API (New)**
4. **Credentials → Create credentials → API key**
5. **Restrict the key:**
   - *Application restrictions* → **HTTP referrers** → add `http://localhost:*/*`
     and your deployed domain(s)
   - *API restrictions* → restrict to the two APIs above
6. In the app, click **Add API key** (top right) and paste it. Stored only in
   your browser (`localStorage`).

**Cost control:** each search requests a minimal field set (`websiteURI`,
`nationalPhoneNumber`, `rating`, etc.) via field masking and caps results, to
stay within Google's free monthly allowance for normal prospecting.

## Moving persistence to Base44 (your pipeline in the cloud)

Today saved leads live in `localStorage` (`src/lib/leadStore.js`). To make the
pipeline cloud-backed and shareable across devices via Base44:

### 1. Create a `Lead` entity in the Base44 dashboard

> ⚠️ Base44 entities must be created in the dashboard/AI chat first — adding a
> JSONC file to the repo does **not** create the entity.

| Field          | Type   | Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------- |
| `place_id`     | string | Google place id (dedupe key)                               |
| `name`         | string |                                                            |
| `address`      | string |                                                            |
| `phone`        | string |                                                            |
| `website`      | string | empty = no site                                            |
| `presence`     | enum   | `none` \| `social` \| `site`                               |
| `lat`          | number |                                                            |
| `lng`          | number |                                                            |
| `rating`       | number |                                                            |
| `review_count` | number |                                                            |
| `category`     | string |                                                            |
| `outreach`     | enum   | `new`\|`contacted`\|`interested`\|`sold`\|`not_interested` |
| `notes`        | string |                                                            |

### 2. Swap the store implementation

`src/lib/leadStore.js` is the only file that touches persistence. Replace the
`localStorage` bodies with Base44 SDK calls — the component API stays identical:

```js
import { Lead } from "@/api/entities";
// getSavedList -> await Lead.list("-created_date")
// saveLead     -> await Lead.create({ ...lead, outreach: "new" })
// updateLead   -> await Lead.update(id, patch)
// removeLead   -> await Lead.delete(id)
```

### 3. Publish

Sync the repo in the Base44 dashboard, then **Publish** (pushing to GitHub alone
does not deploy a Base44 app).

## Tech

Vite + React 18 + Tailwind + React-Leaflet (free OpenStreetMap tiles) +
Google Places (New). Presence logic in `src/lib/classify.js`.
