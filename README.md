# Utazási — Next.js + TypeScript + Tailwind

Ez a `villasimius-guide` (vanilla HTML/CSS/JS) projekt újraírása
`ARCHITECTURE.md` szerint: Next.js (App Router) + React + TypeScript +
Tailwind CSS, komponens-alapú, `src/{app,components,lib,data,hooks,types}`
struktúrában.

## ⚠️ Fontos — build nem volt tesztelve itt

Ez a kód egy olyan sandboxban készült, amelynek **nincs internet-hozzáférése
az `npm install`-hoz** (a registry.npmjs.org 403-at ad). Emiatt a forráskódot
gondos kézi ellenőrzéssel írtam meg, de **nem tudtam ténylegesen lefuttatni**
`npm install`, `next build` vagy `next dev` parancsokat, ahogy a vanilla
verziónál `node -c`-vel tudtam szintaxist ellenőrizni.

**Neked kell futtatnod, ahol van internet:**

```bash
npm install
npm run dev
# http://localhost:3000
```

### Ha a build elakad — a legvalószínűbb helyek

1. **`src/components/Icon.tsx`** — a `lucide-react/dynamicIconImports` import
   útvonal verziófüggő lehet. Ha hibát dob, nézd meg a
   [lucide.dev dinamikus ikon útmutatóját](https://lucide.dev/guide/packages/lucide-react#dynamicicon-component) —
   újabb `lucide-react` verziókban ez `lucide-react/dynamic`
   (`DynamicIcon` komponens) útvonalra váltott át.
2. Egy-egy ikonnév (pl. `"ice-cream-cone"`, `"moon-star"`, `"toilet"`) esetleg
   nem létezik pontosan ezen a néven a csomagban — ezek a `data/rhythms.ts`
   és a kártya-komponensek `Icon name="..."` hívásaiban vannak. Mivel a
   feloldás dinamikus, egy hibás név csak az adott ikont hagyja üresen, nem
   töri el az egész buildet — de érdemes átnézni a
   [lucide.dev/icons](https://lucide.dev/icons) listát, ha valami nem
   jelenik meg.
3. `tailwind.config.ts` egyéni tokenjei (pl. `rounded-m`, `shadow-card`,
   `backdrop-blur-glass`) — ha a Tailwind verzió, amit az `npm install`
   ténylegesen letölt, eltér a `package.json`-ban pinneltől, előfordulhat
   apró API-eltérés.

## Struktúra

```
src/
  app/            Next.js route-ok (App Router): /, /days, /beaches, /restaurants, /budget
  components/     Újrahasznosítható UI komponensek
  data/           Utazás-specifikus adatok (napok, strandok, éttermek…)
  hooks/          useLiveClock, useLiveData, useLocalStorage
  lib/            Idő-, storage- és élő adat- (weather/sea/fx) segédfüggvények
  types/          Megosztott TypeScript interfészek
public/
  manifest.json   PWA manifest
  service-worker.js  Offline app-shell cache (Next.js build-tudatos)
  icons/, images/ Statikus asset-ek (a vanilla verzióból átemelve)
```

## Design system

A `DESIGN_SYSTEM.md` és `DESIGN_PRINCIPLES.md` tartalma a `tailwind.config.ts`
színtokenjeiben és a komponensek stílusaiban van implementálva:

- Színek: Quartz / Deep Sea / Mediterranean Turquoise / Coral / Sand / Olive
- Tipográfia: Fraunces (display) · Inter (body) · IBM Plex Mono (adat/idő) —
  `next/font/google`-lel build-időben self-hosztolva (nincs runtime külső
  font-hívás)
- Ikonok: kizárólag Lucide (`lucide-react`), nincs emoji
- Liquid Glass: csak a három engedélyezett felületen (időjárás-panel, alsó
  navigáció, aktív timeline-kör)

## Amit szándékosan nem migráltam még

A `ROADMAP.md` saját ütemezése szerint ezek külön mérföldkövek:

- **AI Research Agent** (`AI_RESEARCH_AGENT.md`) — automatikus adatgyűjtés
  strandokról/éttermekről. Ez külön backend/API-integrációt igényel, nem
  csak frontend-migrációt.
- **IndexedDB** — jelenleg LocalStorage van (`src/lib/storage.ts`,
  `src/hooks/useLocalStorage.ts`), ami a `PRODUCT.md` szerint is az első
  lépés.
