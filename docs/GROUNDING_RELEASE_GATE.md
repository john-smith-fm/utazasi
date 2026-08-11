# Kérdezési — Grounding Release Gate

Az Utazási Kérdezési válaszrétege csak jóváhagyott, alkalmazásba adott
kontextusból dolgozhat. A nyelvi modell később értelmezhet és összefoglalhat,
de nem pótolhat hiányzó utazási tényt saját világismeretből.

## Kötelező szabályok

- Nincs kitalált távolság vagy menetidő.
- Nincs kitalált ár, belépő vagy nyitvatartás.
- Nincs kitalált bolti készlet vagy családi alkalmasság.
- Ismeretlen adatnál a válasz ezt világosan kimondja.
- Minden tényhez belső forrás tartozik: `Timeline`, `Place`, `Weather`,
  `Shopping Intelligence`, `Mobility` vagy `Event`.
- A Kérdezési nem módosítja automatikusan a Timeline-t.

## Futtatás

```bash
npm run test:grounding
```

## Jelenlegi fixture-k

A tesztkészlet lefedi többek között:

- kiválasztott napi Timeline és következő program;
- hiányzó Mobility-route;
- időjárási kontextus;
- ismert és hiányzó strandszakasz;
- esemény kezdési idő, törölt és többnapos Event;
- tűzijáték és belépő ismeretlen állapota;
- `unknown` babatermék-adat;
- Shopping Place-ajánlás és Place Detail átjárás;
- kétértelmű szabad szöveg.

Egyetlen teszthiba `NO-GO`: az AI-szintézis vagy új Kérdezési intent csak a
hibás eset javítása és a teljes gate ismételt, sikeres futása után kerülhet
élesbe.
