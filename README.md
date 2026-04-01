# Harbour.Space Framer Tracking

Mixpanel tracking scripts for Harbour.Space University's Framer landing pages.

## Why this repo exists

Framer limits custom code blocks to **5,000 characters**. The Mixpanel init snippet alone is ~2,000 characters, leaving almost no room for tracking logic. This repo hosts JS files served via **jsDelivr CDN**, so each Framer page only needs a single `<script src>` tag (~100 characters).

## Framer setup

Each Framer project has two custom code slots. Both must be set to **Run: On Every Page Visit**.

### 1. `<head>` — Paste this exactly

```html
<script src="https://cdn.jsdelivr.net/gh/reboiedo/mixpanel-framer@latest/init.js"></script>
```

This loads the Mixpanel SDK and configures it (EU residency, sendBeacon, autocapture, session recording, etc.). No tracking logic.

### 2. End of `<body>` — Paste the script for your page type

For programme pages (`/programmes/*`):

```html
<script src="https://cdn.jsdelivr.net/gh/reboiedo/mixpanel-framer@latest/programmes.js"></script>
```

For future page types, add the corresponding script tag (e.g., `application.js`, `homepage.js`).

### URL pattern

```
https://cdn.jsdelivr.net/gh/reboiedo/mixpanel-framer@latest/[filename].js
```

`@latest` resolves to the most recent git tag. To deploy changes:
1. Push to `main`
2. Create a new tag: `git tag v1.x && git push origin v1.x`
3. jsDelivr picks up the new tag immediately — no cache purging needed.

## Repo structure

```
/
├── README.md          ← this file
├── init.js            ← Mixpanel SDK loader + config (loaded via CDN in Framer <head>)
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
