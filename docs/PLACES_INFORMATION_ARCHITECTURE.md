# Helyek — információs architektúra

## Cél

A Helyek egyetlen böngészési belépési pont. Nem külön strand-, bolt- és étteremalkalmazásokból áll.

## Kategóriák

| Felhasználói kategória | Technikai Place típusok |
| --- | --- |
| Strandok | `beach` |
| Nyami | `restaurant`, `cafe` |
| Boltok | `shop` |
| Programok | `playground`, `sight`, `parking`, `other` |

Ez a leképezés a `src/lib/place-categories.ts` egyetlen konfigurációjában él. A Place adatok technikai típusai ettől függetlenek maradnak.

## Route-ok

- Kanonikus böngészési út: `/places?category=beaches|food|shopping|activities`
- A régi `/beaches` és `/restaurants` címek kompatibilitási átirányítások.
- A Place Detail a megnyitáskor aktív kategóriához tér vissza; direkt megnyitáskor a Place típusa alapján választ kategóriát.

## Meglévő komponensek

`PlaceListItem`, `PlaceDetail`, a kanonikus Place adatforrás és a Timeline Place Picker változatlanul közösek. Ez a sprint csak a böngészési belépési pontot és navigációt rendezte át.
