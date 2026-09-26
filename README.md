# MSc Scholarship Command Center

A dependency-free, minimal scholarship planning dashboard tailored to the 2027 MSc scholarship findings discussed on 26 Sep 2026.

## Features

- Priority-ranked scholarship portfolio
- Open / upcoming / ineligible status filters
- Search across scholarships, countries and routes
- Per-scholarship execution checklists
- Master document packet checklist
- LocalStorage-based progress persistence
- Profile-fit dashboard and narrative architecture
- Deadline timeline
- Light/dark theme
- Fully responsive layout
- Official source links inside each scholarship detail dialog

## Run locally

Because the app uses ES modules, serve the folder rather than opening `index.html` directly from `file://`.

```bash
cd scholarship_command_center
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

This is a static site and can be deployed directly to:

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- Any nginx / static file host

No build step is required.

## Architecture

- `index.html` — semantic application shell
- `assets/styles.css` — tokenized responsive UI system
- `src/data.js` — scholarship/profile source-of-truth data
- `src/app.js` — state, rendering, interactions, local persistence

## Important

Scholarship data is a snapshot from **26 Sep 2026**. Verify deadlines, eligibility and funding on official sources before applying.
