# Utazási — Design System & Build Specification

**Verzió:** 3.0  
**Állapot:** elsődleges vizuális specifikáció  
**Cél:** az alkalmazás teljes vizuális és interakciós referenciája.

Ez a dokumentum önmagában elegendő egy új vagy módosított felület megépítéséhez. Nem szükséges hozzá korábbi beszélgetés, képernyőkép, prototípus vagy git-előzmény. Ahol nincs kifejezett szabály, a rendszerrel összhangban lévő legegyszerűbb megoldást kell választani.

Új képernyőhöz nem szabad új vizuális nyelvet létrehozni.

## 1. Karakter

Az Utazási nyugodt, meleg, mediterrán, családközpontú és visszafogottan prémium. Utazási társnak, nem dashboardnak kell hatnia.

- Az információ előbbre való a díszítésnél.
- A tartalom előbbre való a kezelőfelület-elemeknél.
- A kevesebb elem és a sok üres tér tudatos döntés.

Kerülendő a sok kártya, a zsúfolt információs panel, a technikai/admin felület, a fölösleges dekoráció és a versengő színek.

## 2. Elsőbbségi szabály

Ez a fájl a projekt egyetlen elsődleges vizuális referenciája. Ha egy korábbi dokumentum, képernyőkép vagy kódrészlet eltér tőle, ez a specifikáció érvényes. Egy későbbi, kifejezetten elfogadott termékdöntés felülírhatja; ezt ebben a dokumentumban is rögzíteni kell.

Kiegészítő, nem normatív anyagok:

- `docs/DESIGN_SYSTEM.md` — rövid token-összefoglaló;
- `docs/DESIGN_PRINCIPLES.md` — rövid termék-elv összefoglaló;
- `docs/BRAND.md` — márkaanyagok.

## 3. Design tokenek

### Színek

| Név | Érték | Használat |
| --- | --- | --- |
| Quartz | `#F8F7F3` | fő háttér |
| Deep Sea | `#18323B` | elsődleges szöveg |
| Coral | `#F18C79` | márka-akcentus |
| Turquoise | `#4CB8C4` | másodlagos akcentus |
| Turquoise Dark | `#2E8A93` | ikonok, támogató szöveg |
| Sand | `#EFE7DA` | másodlagos felület |
| Olive | `#708A64` | kontextuális akcentus |
| White | `#FFFFFF` | világos kontrasztfelület |
| Light Surface | `#F7F6F2` | világos másodlagos felület |
| Divider | `#EEEAE2` | elválasztó |
| Medium Neutral | `#B2ACA1` | visszafogott semleges |

Új színárnyalatok helyett átlátszóságot kell használni:

```css
rgba(24, 50, 59, .60)
rgba(24, 50, 59, .55)
rgba(24, 50, 59, .35)
rgba(24, 50, 59, .10)

rgba(241, 140, 121, .20)
rgba(241, 140, 121, .15)
rgba(241, 140, 121, .10)

rgba(76, 184, 196, .10)
```

### Tipográfia

- **Inter:** törzsszöveg, navigáció, gomb, Timeline és címke; 400, 500, 600, 700.
- **Fraunces:** csak nagy, érzelmi display-pillanatok; 400, 500, 600, 700.
- **IBM Plex Mono:** kizárólag technikai/numerikus kontextusok.

| Szerep | Méret / sormagasság | Súly |
| --- | --- | --- |
| Hero title | 14 / 19 px | 700 |
| Hero date | 14 / 19 px | 500 |
| Főcím | 20–24 / 30 px | 700, `-0.03em` |
| Alcím | 14 / 21 px | 400, Deep Sea 60% |
| Timeline cím | 17 / 23 px | 700 |
| Timeline meta | 13 / 21 px | 400 |

### Térköz és geometria

- Alapegység: 4 px.
- Engedélyezett lépések: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64 px.
- Oldalsó belső margó: 20 px.
- Maximális mobil tartalomszélesség: 430 px.
- Radius: 14 px (small), 20 px (medium), 28 px (large), `9999px` (pill).

```css
/* soft shadow */
0 6px 20px rgba(24, 50, 59, .06)

/* glass shadow */
0 18px 44px rgba(43, 41, 38, .12),
0 2px 8px rgba(43, 41, 38, .05)

/* FAB shadow */
0 12px 28px rgba(217, 99, 57, .28)
```

## 4. Layout és reszponzivitás

Mobile-first felület. Az elsődleges tervezési cél 375 px szélesség; 390 px-en nem változhat meg a struktúra, 430 px-en csak a levegő növekedhet.

- A safe area-t minden képernyőn tiszteletben kell tartani.
- Csak a Bottom Navigation és a Floating Action Button lehet fix.
- Minden más a függőleges scroll része.
- Nincs vízszintes oldal-scroll és nincs olvashatatlanul összenyomott UI.
- Minimum érintési cél: 44 px.

## 5. Márka és logó

A logó dekoratív márkaelem, nem gomb. A logóváltozatot a felület kontrasztja határozza meg:

- **fehér logó** sötét vagy fotós Hero-felületen;
- **korall logó** világos, Quartz/bézs felületen.

Ez nem két külön arculat: ugyanazon márka megfelelő kontrasztú változatai. A logó nem fedhet interaktív elemet.

## 6. Komponensspecifikációk

### Hero

Feladata az érzelmi helyszínkontextus.

- Magasság: 204 px + safe area.
- Háttér: helyszínfotó, sötét, olvashatóságot biztosító átmenettel.
- A fehér logó balra igazított, nagy és dekoratív.
- A jobb oldali információ: célállomás (`Szardínia`) és dátum; a célállomás hangsúlyosabb.

Tilos CTA-t, időjárás-táblát vagy további információs blokkot a Hero-ba tenni.

### Weather Bar

Lebegő, funkcionális glass felület gyors környezeti információhoz.

- Radius: 22 px.
- Blur: 20 px.
- Háttér: `rgba(255, 255, 255, .78)`.
- Tartalom: csak ikon és érték — például `24°`, `18°`, `4 km/h`.
- Nincsenek metrika-címkék.

### Journey Story és Journey Picker

Sorrend: cím, Day Picker, alcím. Minden középre igazított, további címke nélkül.

A Picker Apple-szerű, közvetlen manipulációjú érzetet ad:

- a kiválasztott elem mindig középen van;
- legfeljebb öt elem látszik;
- nincs kártya, kapszula, keret, árnyék;
- a kiválasztott elem nagy, sötét és éles;
- a szomszédok kisebbek, halványabbak és enyhén blurözöttek;
- a mozgás sima, fizikai érzetű, középre bepattanó.

### Timeline

A Timeline a fő tervezési felület, nem kártyalista.

Sorrendje: idő → aktivitás → hely → leírás. Az események között 28 px térköz van.

- Idő: 13 px.
- Cím: 17 px, bold.
- Leírás: 14 px.
- Normál program: türkiz akcentus.
- Utazási blokk: visszafogott, rendszer által generált megjelenés.
- Helyi esemény: korall akcentus, a kézzel létrehozott programtól egyértelműen eltérően.

### Gombok

| Elem | Szabály |
| --- | --- |
| Floating Action Button | Az egyetlen teljes korall elem; 54 × 54 px, kör, FAB-árnyék. |
| Normál gomb | Soha nem teljes korall; korall keret, 10–20% korall kitöltés, sötét szöveg, 44–56 px magas. |

### Bottom Sheet

- Felső sarkok: 28 px.
- Háttér: Quartz.
- Grabber: 40 × 6 px.
- Tartalmi belső margó: 20 px.

### Glass, ikonok, állapotok

A glass funkcionális eszköz: Weather Bar, sheet és lebegő kezelőelem használhatja. Nem tehető minden kártyára, szakaszra vagy dekoratív panelre.

Az ikonok egységes vonalstílusúak, emoji nem használható. Kis adat-ikon: 18 px; fő akció: 24 px.

Minden komponensnek kezelnie kell a loading, empty, error, offline és success állapotot. Hiányzó adat helyett `—` jelenik meg; értéket kitalálni tilos.

## 7. Mozgás és hozzáférhetőség

| Típus | Időtartam |
| --- | --- |
| Gyors | 120–180 ms |
| Normál | 180–250 ms |
| Nagy | 250–350 ms |

Az animációnak mindig funkcionális célja van. Bounce, dekoratív mozgás és lassú átmenet nem használható. A `prefers-reduced-motion` beállítást támogatni kell.

Legyen olvasható a kontraszt, látható minden állapot és használható a billentyűzetes interakció ott, ahol releváns.

## 8. Fejlesztési szabályok

- Meglévő komponenst és designtokent kell újrahasználni.
- Új szín, gomb- vagy kártyastílus nem található ki.
- Új mintánál először a legközelebbi meglévő komponenst kell kiterjeszteni; új minta csak elkerülhetetlen esetben hozható létre.
- A projektben kell implementálni; különálló HTML-prototípus nem helyettesíti a valódi Next.js felületet.
- A specifikáció által nem definiált részletnél a legegyszerűbb, rendszerkompatibilis megoldást kell választani.

## 9. Minőségi kapu

Egy képernyő csak akkor tekinthető elfogadhatónak, ha:

- a fenti színeket és betűket használja;
- megtartja a spacing-ritmust;
- nem vezet be új UI-nyelvet;
- 375 px-en működik;
- kezeli a safe area-t;
- rendelkezik loading, error és empty állapottal;
- egyértelműen ugyanahhoz az Utazási alkalmazáshoz tartozik.

