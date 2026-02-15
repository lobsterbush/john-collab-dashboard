# Crabtree & Holbein Projects — WARP guide

A lightweight dashboard to track projects with quick filters, tasteful animations, and a simple data pipeline.

## Live links
- Deployed site (GitHub Pages): https://lobsterbush.github.io/john-collab-dashboard/
- Google Sheet (edit/manage): https://docs.google.com/spreadsheets/d/1N283SOIKYVENHfbmeKagkbd8WdvBOmVa5TTc6tIBNdw/edit?gid=690535049#gid=690535049
- Published CSV endpoint (used by the Refresh button): https://docs.google.com/spreadsheets/d/e/2PACX-1vQcaV3c26B7OdZzLLRT3Ck3zqgdeMsjZ-grsZ3r0zTiBHITWnceSsFEUGm9d0eTFNJseNLtbbf9aDMA/pub?gid=690535049&single=true&output=csv

## Data flow (fast and resilient)
1. Embedded data: `data/projects.js` (loads instantly; always available)
2. JSON file: `data/projects.json` (static copy in repo)
3. Google Sheets CSV (Refresh button or Auto‑refresh)
4. Local CSV fallback: `data/projects.csv`

The UI shows the current source in the "Last updated … • Source: …" label.

## Quick start (local)
1. Start a tiny server and open the app:
   ```bash
   python3 -m http.server 8888
   # then open http://localhost:8888
   ```
2. Or just open `index.html` directly; the embedded data still works. A server is recommended for fetch caching behavior.

## Google Sheets
- Edit your data in the Sheet above.
- Ensure it is "Published to the web" (CSV) — you should already see the CSV link above.
- Columns (in order):
  `Timestamp, Title, Abstract, Status, Submission Date, Target Journal, Priority, Deadline, IRB Status, Funding, Docs Link, Coauthors, Keywords, Last Activity`
- Allowed values that affect styling/filters:
  - Status: Idea, Research design, Data collected, Data analyzed, Writing, Submitted
  - Priority: High, Medium, Low
  - IRB Status: Approved, Pending, Not needed

## Refresh and Auto‑refresh
- Click "Refresh from Google Sheets" in the header to pull the latest.
- Toggle Auto‑refresh and choose an interval (5/10/30 min). Your choice is saved locally.

## Updating data from CSV (no Sheets)
- Edit `data/projects.csv`.
- Generate the JSON + embedded JS and commit:
  ```bash
  node scripts/build_data.mjs
  git add data/projects.json data/projects.js data/projects.csv
  git commit -m "Update projects data"
  git push
  ```

## Customize the look
- All colors live at the top of `css/style.css` as CSS variables, e.g.:
  ```css
  --status-idea-bg: #FEF3C7; --status-idea-fg: #92400E;
  --priority-high-bg: #FEE2E2; --priority-high-fg: #B91C1C;
  --irb-approved-bg: #DCFCE7; --irb-approved-fg: #166534;
  ```
- Emoji badges inherit category colors. Tweak variables and refresh.

## Password overlay (light barrier only)
- This is intentionally lightweight and not secure for sensitive data.
- To change the password hash in `js/auth.js`:
  1) In the browser console on the dashboard, run:
     ```js
     simpleHash('yourNewPassword')
     ```
  2) Copy the result and replace `PASS_HASH` in `js/auth.js`.
  3) Commit and push.

## Deploy
- Pushing to `main` updates GitHub Pages automatically.
- Live URL: https://lobsterbush.github.io/john-collab-dashboard/

## Troubleshooting
- Stuck on "Loading" after a refresh:
  - Confirm the Sheet is published to the web (CSV).
  - Try manual refresh again; watch the footer "Source" label.
- Fetch errors when opening via Finder: run a local server (see Quick start).
- Styling looks off: hard refresh or clear cache.

## Repo structure
```
john-collab-dashboard/
├── index.html            # App shell
├── css/style.css         # Styles (palette at the top)
├── js/app.js             # Data loading, filtering, rendering
├── js/auth.js            # Lightweight password overlay
├── data/
│   ├── projects.csv      # Editable CSV source (optional)
│   ├── projects.json     # Generated JSON (from CSV)
│   └── projects.js       # Generated embedded data (from CSV)
├── scripts/build_data.mjs# CSV → JSON+JS generator
└── warp.md               # This guide
```

## Roadmap ideas
- Optional toggle to prefer Sheets on initial load
- CSV export of current filtered view
- Tag chips with keyboard navigation

—
Maintainer: Charles Crabtree
