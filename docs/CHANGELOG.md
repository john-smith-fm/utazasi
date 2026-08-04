# CHANGELOG

## Template

### Added

### Changed

### Fixed

### Removed

---

## v0.3 — Migráció Next.js + TypeScript + Tailwindre

### Added
- Teljes újraírás `ARCHITECTURE.md` szerint: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Valódi route-ok (`/`, `/days`, `/beaches`, `/restaurants`, `/budget`) a korábbi show/hide screen-váltás helyett
- Típusos adatréteg (`src/types`, `src/data`) — minden trip/day/beach/restaurant adat TypeScript interfésszel
- Újrahasznosítható komponens-könyvtár (`src/components`): DayPicker, PlanList, TimelineCard, BeachCard/RestaurantCard/PlaygroundCard, ExpenseTracker, PackingList, Journal, stb.
- `lucide-react` csomag valódi Lucide ikon-komponensekkel (a korábbi CDN-es `<i data-lucide>` megoldás helyett), dinamikus név-feloldással (`Icon.tsx`)
- `next/font/google` — Fraunces/Inter/IBM Plex Mono build-időben self-hosztolva, nincs runtime külső font-hívás
- Next.js-tudatos service worker (`public/service-worker.js`): cache-first a hash-elt `/_next/static` asseteknek, network-first fallback mindenre máshova

### Changed
- `docs/` mappa átemelve a projektbe
- README kiegészítve build-instrukciókkal és ismert kockázati pontokkal (a fejlesztői sandboxban nem volt elérhető `npm install`, ezért a build itt nem lett ténylegesen tesztelve)

### Fixed

### Removed
- Build nélküli, egyetlen-mappás vanilla HTML/CSS/JS felállás (a `villasimius-guide/` mappában továbbra is megmarad, párhuzamos verzióként)

---

## v0.2 — Design System v1.0 rollout

### Added
- Mediterranean Premium Color System v1.0 (Quartz / Deep Sea / Mediterranean Turquoise / Coral / Sand / Olive) as CSS custom properties, incl. neutral scale (N100–N900) and semantic colors (success/warning/error/info)
- Lucide icon system, replacing all emoji across the UI (nav, weather panel, day-plan rows, place tags, buttons)
- Liquid Glass effect, restricted to the three approved surfaces: weather panel, bottom navigation, active timeline circle
- Magnetic scroll-snap behavior on the Trip Timeline day-picker; selected day rendered larger with a glass treatment
- Runtime caching (service worker) for cross-origin static assets (Google Fonts, Lucide CDN) so icons/type survive offline after first load
- `docs/` folder with project specs (BRAND, ARCHITECTURE, ROADMAP, AI_RESEARCH_AGENT, DESIGN_PRINCIPLES, DESIGN_SYSTEM, PRODUCT)

### Changed
- Home screen restructured: Trip Timeline card (day-picker) + flat "Mai terv" plan list + "Következő hely" card, replacing the earlier single mood/today card
- Napok screen restructured: sticky day-picker rail + single-day detail panel, replacing the full-day accordion list
- Theme color / manifest colors updated to Deep Sea (`#18323B`)
- Placeholder photography (hero, beaches, restaurants, playgrounds) regenerated in the new palette

### Fixed
- Removed decorative emoji from countdown copy for consistency with the icon-only rule

### Removed
- Old accordion-based day list and its rhythm-rail markup (superseded by the flat plan list)

---

## v0.1 — Initial build

### Added
- Vanilla HTML/CSS/JS PWA scaffold (no framework, no build step): `index.html`, `style.css`, `app.js`, `data.js`, `manifest.json`, `service-worker.js`
- Trip data for 2026.09.02–13 (Villasimius, Szardínia): 12 napos ütemezés, 6 strand, 3 étterem, 2 játszótér, valós utazási/szállás/autóbérlési adatokkal
- Bottom tab navigation: Home / Napok / Strandok / Éttermek / Költségek
- Live data integration: Open-Meteo (időjárás, UV, szél, napkelte/napnyugta), Open-Meteo Marine (tengerhőmérséklet), frankfurter.app (EUR/HUF árfolyam) — mind API-kulcs nélkül, localStorage fallback-kel offline esetére
- Költségkövető, pakolási lista, napló — mind LocalStorage-ben tárolva
- Offline app-shell caching szervizmunkással (service worker)
