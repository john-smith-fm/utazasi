# Timeline v1 — fejlesztési határ

Ez a dokumentum a [v4 komponensspecifikáció](./COMPONENT_SPECIFICATION.md) Timeline-fejezetének megvalósítási sorrendjét rögzíti.

## v1A — read-only megjelenítés

Cél: a napi Timeline a meglévő `trips → days → timeline_activities` read láncból jelenjen meg, idő szerint rendezve (`start_time`, majd `created_at`).

### Benne van

- lineáris, kártyamentes Timeline 375 px-es elsődleges nézetre;
- normál program, travel blokk, helyi esemény és időütközés megjelenítési mintája;
- `start_time + duration_minutes` szerinti, csak figyelmeztető konfliktusjelzés;
- loading, empty, error és cache-elt offline állapot;
- per-nap localStorage cache sikeres read után;
- safe-area és a Bottom Navigation/FAB melletti megfelelő alsó tér.

### Nincs benne

- adatmodell- vagy RLS-változtatás;
- író API vagy kliensoldali Supabase write;
- Bottom Sheet, Full Screen Editor, hozzáadás, törlés vagy swipe;
- vizuális sorrendezés vagy Timeline-sor drag targetként.

### Jelenlegi adatmodell-korlát

A `timeline_activities` Sprint 1 sémában csak `plan` és `travel` `kind` szerepel; nincs még `source_event_id` vagy helyi-esemény jelölő. A local-event komponensminta ezért támogatott a kliensoldali adatban, de Supabase-ből akkor kap majd valódi jelet, amikor az adatmodellben külön eseménykapcsolat lesz. A v1A ezt nem találja ki és nem módosítja.

## v1B — külön CRUD-sprint

Előfeltétel: membership-alapú, biztonságos írási réteg és megfelelő RLS-policy.

Csak utána készülhet el:

- Activity Bottom Sheet;
- Full Screen Editor;
- új program;
- szerkesztőből történő időmódosítás;
- swipe-left delete és 5 másodperces Undo;
- mentés utáni automatikus időrendi újrarendezés.

A teljes Timeline-sor iPhone-on nem drag target. Közvetlen drag csak később, külön legalább 44 × 44 px-es handle-lel jöhet szóba.

## Place rendszer

A helyekhez közös `PlaceListItem` és `PlaceDetail` komponensrendszer készül. Strand, étterem, játszótér és egyéb különbséget a `place.type` és a valóban rendelkezésre álló adat adja, nem külön kártyanyelv. Ez csak a `places` adatmodell és az importált, kanonikus adatok után indul.
