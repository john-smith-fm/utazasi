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

## v1B — PIN-védett CRUD-sprint

A projekt elfogadott hozzáférési modellje közös, tartós családi PIN-session, nem egyénenkénti Supabase Auth. Ezért az írási réteg a PIN-sessiont ellenőrző Next.js API-kban fut:

```text
PIN-session → szerveroldali validáció → engedélyezett trip/day ellenőrzése → Supabase
```

A böngésző nem kap Supabase secret vagy service-role kulcsot. A `trip_members` tábla és a korábbi Auth/RLS-migrációk nem a v1B write-engedély forrásai; minden PIN-birtokos azonos, családi szerkesztői jogosultságot kap az egyetlen engedélyezett utazáshoz.

v1B-ben készül el:

- egységes Full Screen Editor create és edit módhoz;
- új program;
- szerkesztőből történő időmódosítás;
- swipe-left delete és 5 másodperces Undo;
- mentés utáni automatikus időrendi újrarendezés.

### v1B szerkesztési útvonal

```text
Normál, kézzel létrehozott program tap → Full Screen Editor (edit)
FAB → Full Screen Editor (create)
Travel / system / local event → nem szerkeszthető
```

Timeline-szerkesztésben nincs Bottom Sheet. A Bottom Sheet későbbi, valódi gyors döntésekhez marad fenn: helyválasztás, valódi alternatívák vagy AI-javaslat elfogadása.

## v1C — közvetlen időmódosítás

Ez a v1B utáni, külön touch-interakciós sprint. Nem klasszikus listás drag-and-drop, és nem az elemet lehet két másik közé vizuálisan átrendezni.

- csak az `start_time` módosul közvetlen húzással;
- a sorrend továbbra is kizárólag az időből következik;
- csak külön, legalább 44 × 44 px-es drag handle használható;
- a teljes Timeline-sor iPhone-on soha nem drag target, így a függőleges görgetés természetes marad;
- húzás közben az új időpont látható;
- elengedéskor a `start_time` mentődik, majd a Timeline időrendben újrarendeződik;
- ütközés esetén figyelmeztetés jelenik meg, automatikus átszervezés nem történik.

A Journey Picker dragje ettől független, már definiált közvetlen manipulációs interakció.

## Place rendszer

A helyekhez közös `PlaceListItem` és `PlaceDetail` komponensrendszer készül. Strand, étterem, játszótér és egyéb különbséget a `place.type` és a valóban rendelkezésre álló adat adja, nem külön kártyanyelv. Ez csak a `places` adatmodell és az importált, kanonikus adatok után indul.
