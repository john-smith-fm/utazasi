# Utazási kanonikus helyadatok

Ez a könyvtár a Gitben verziózott, ember által jóváhagyott helyismeretet tartja.

Az első strand- és étteremkészlet az `utazasi_data_codex_v1.1` csomagból került be.
A jóváhagyott `utazasi_v2f_place_knowledge_package_v0.1` ezt 2026-08-07-én
bővítette és gazdagította: strandok, éttermek, látnivalók, játszóterek,
kávézók és boltok egyaránt ide tartoznak. A `hold_review.json` jelöltjei nem
részei a kanonikus adatkészletnek.

Az eredeti stabil `id` mezők megmaradnak; a `slug` a frontend és a Timeline
emberileg olvasható, stabil kapcsolókulcsa.

A Supabase későbbi runtime-adatbázis; nem helyettesíti ezt a kanonikus forrást.

## Companion irányelvek

A `companion/` könyvtár a jóváhagyott, kanonikus viselkedési szabályokat tartja:

- Smart Status prioritás;
- Weather Context szerepe;
- Kérdezési minták;
- automatikus Event Watch és értesítési szabályok;
- AI-korlátok.

Ezek nem futásidejű Timeline- vagy Place-adatok, és nem helyettesítik a
`places/` könyvtár ember által jóváhagyott forrását.
