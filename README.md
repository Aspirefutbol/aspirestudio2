# Aspire Coaching Studio

Aspire FC's coaching platform. Coaches use it to plan the week, build sessions and drills, run match day, and track player development.
It's a static web app with no build step. Open `index.html` through any static server.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Without the Netlify backend (see below) the app runs in **local mode**, which saves everything to the browser's localStorage.

## Project layout

| Path | What's in it |
| --- | --- |
| `index.html` | Page markup: the left rail, the app bar, every view and the modals |
| `css/1-base.css` | Reset, design tokens and base component styles |
| `css/2-core.css` | Core Studio layout and components |
| `css/3-features.css` | App bar, Home, Methodology and Match Day |
| `css/4-governance.css` | Methodology governance / dictionary styles |
| `css/5-themes.css` | Theme and UX refinement layers. They load last and win the cascade |
| `js/appbar.js` | Top app bar: search, team picker, notifications, account menu |
| `js/auth-gate.js` | Login / invite / password-recovery screen (uses Netlify Identity) |
| `js/cloud-sync.js` | Mirrors `afc_*` localStorage keys to the cloud account |
| `js/fos-freeze.js` | Locks the canonical methodology dictionary |
| `js/app.js` | The Studio app: views, drill designer, planners, intelligence |
| `js/data/fos-methodology.js` | Canonical Aspire methodology (`window.FOS`) |
| `js/data/drill-guide.js` | Aspire drill guide library (`window.AFC_GUIDE`) |
| `js/voice-note-fab.js`, `js/feedback-widget.js` | Floating voice-note and coach-feedback buttons |
| `assets/` | Images (club crest) |
| `tools/build_single_file.py` | Bundles everything back into one HTML file |

Load order matters. The stylesheets cascade in the numbered order, and the scripts run synchronously where they sit in `index.html`.
`js/app.js` exposes `window.AspireStudio` for code outside its closure, such as the app bar.

## Single-file build

```bash
python3 tools/build_single_file.py   # -> dist/aspire-studio.html
```

This gives you one self-contained file. You can paste it into a Claude chat, send it as a preview, or drop it on Netlify Drop.

## Deploying to Netlify

Publish directory: `.` (the repository root). No build command is needed.

The app also expects these Netlify-side pieces, which are **not in this repo yet**:

- `/auth.js`: the Netlify Identity client that sets `window.AspireIdentity`
- `/api/me` and the cloud-sync API used by `js/cloud-sync.js` (Netlify Functions)
- The `studio-feedback` Netlify Form, which is detected from the hidden form in `index.html`

Add them to this repo before you switch the live site to deploy from Git.

> **Note:** login is currently bypassed. Look for `TEMP PREVIEW BYPASS` in `js/auth-gate.js`. Delete that statement to require sign-in again.
