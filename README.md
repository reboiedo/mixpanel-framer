# Harbour.Space Framer Tracking

Mixpanel tracking scripts for Harbour.Space University's Framer landing pages.

## Why this repo exists

Framer limits custom code blocks to **5,000 characters**. The Mixpanel init code is inlined directly in Framer's `<head>` for reliable page view tracking. Page-specific tracking logic (CTA clicks, etc.) is hosted here and served via **githack.com CDN**.

## Framer setup

Each Framer project has two custom code slots. Both must be set to **Run: On Every Page Visit**.

### 1. `<head>` — Paste the init code inline

Paste the contents of `init.js` wrapped in `<script>` tags directly in Framer's `<head>` custom code. This runs immediately without any external fetch, ensuring page views are always captured. See `init.js` for the full code.

### 2. End of `<body>` — Paste the script for your page type

For programme pages (`/programmes/*`):

```html
<script src="https://raw.githack.com/reboiedo/mixpanel-framer/main/programmes.js"></script>
```

For future page types, add the corresponding script tag (e.g., `application.js`, `homepage.js`).

### Deploying changes

- **`init.js` changes** require updating the inline code in Framer's `<head>` and re-publishing the site.
- **`programmes.js` changes** just need a push to `main` — githack.com serves from the branch with a 60-second cache TTL.

## Repo structure

```
/
├── README.md          ← this file
├── init.js            ← Mixpanel SDK loader + config (inlined in Framer <head>)
├── shared.js          ← UTM helpers and waitForMixpanel utility
├── programmes.js      ← tracking for /programmes/* pages
└── [future files]     ← application.js, homepage.js, etc.
```

## How to add tracking for a new page type

1. Create a new JS file (e.g., `homepage.js`) in the repo root.
2. Wrap all code in an IIFE: `(function() { ... })();`
3. Use **ES5 syntax only** — `var`, `function` declarations, no arrow functions, no template literals, no `const`/`let`.
4. Include `waitForMixpanel` inline (don't depend on `shared.js` load order).
5. Fail silently if DOM elements or APIs are missing.
6. Push to `main`.
7. Add the `<script src>` tag to the Framer page's end-of-body custom code, set to **On Every Page Visit**.

## Mixpanel project

- **Token:** `d0874833a3f33f39a4b623c9c7201246`
- **Data residency:** EU (`api-eu.mixpanel.com`)
- **Persistence:** localStorage
- **Session recording:** 100% (lower to 25-50% on high-traffic pages)
