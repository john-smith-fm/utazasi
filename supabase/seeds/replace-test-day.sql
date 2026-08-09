-- Utazási 1.0 — one-time Dashboard seed
-- Generated from canonical Git JSON. Run in Supabase SQL Editor as postgres.
-- Requires migrations 001–008. It is safe to rerun after the first run:
-- later family edits are never overwritten. The old Sep 3 test day is deleted
-- only while its known legacy seed rows still exist.

begin;

do $$
begin
  if to_regtype('public.timeline_time_precision') is null then
    raise exception 'Missing migration 008_add_timeline_time_precision.sql. Run migrations 001–008 first.';
  end if;
end;
$$;

create temporary table _utazasi_seed (payload jsonb not null) on commit drop;
insert into _utazasi_seed (payload) values ($utazasi_seed${"trip":{"version":"1.0","slug":"sardinia-family-2026","name":"Szardínia 2026","destination":{"name":"Villasimius","country":"Olaszország","region":"Szardínia","latitude":39.1372,"longitude":9.5313},"dates":{"start":"2026-09-02","end":"2026-09-13","timezone":"Europe/Rome"},"family_planning":{"travelling_with_child":true,"quiet_window":{"start":"13:00","end":"15:00","purpose":"délutáni pihenés"}},"transport":{"outbound_flight":{"provider":"Ryanair","from":"BUD","to":"CAG","departure":"2026-09-02T10:35","arrival":"2026-09-02T12:45"},"return_flight":{"provider":"Ryanair","from":"CAG","to":"BUD","departure":"2026-09-13T17:30","arrival":"2026-09-13T19:35"},"car":{"provider":"Kiricar","vehicle":"Citroen C3 vagy hasonló","transmission":"Automata","extras":["Gyerekülés"]}},"accommodation":{"name":"Ollastu Apartments Villasimius","check_in":"2026-09-02T15:00","check_out":"2026-09-13T10:00"},"days":[{"date":"2026-09-02","day":2,"weekday":"Sze","title":"Érkezés és ráhangolódás","subtitle":"Utazás, szállás és nyugodt első este."},{"date":"2026-09-03","day":3,"weekday":"Csü","title":"Első strandnap","subtitle":"Tenger, pihenés, családi ritmus."},{"date":"2026-09-04","day":4,"weekday":"Pén","title":"Nyugodt tengerparti nap","subtitle":"Rugalmas, családi tempójú nap."},{"date":"2026-09-05","day":5,"weekday":"Szo","title":"Strandnap","subtitle":"Korai indulással kényelmesebb."},{"date":"2026-09-06","day":6,"weekday":"Vas","title":"Lassú vasárnap","subtitle":"Közeli programok és hosszabb pihenő."},{"date":"2026-09-07","day":7,"weekday":"Hét","title":"Szabad program","subtitle":"A nap rugalmasan alakítható."},{"date":"2026-09-08","day":8,"weekday":"Kedd","title":"Kirándulás vagy pihenés","subtitle":"A napi tervhez igazítható."},{"date":"2026-09-09","day":9,"weekday":"Sze","title":"Hajózás vagy tartaléknap","subtitle":"Időjárástól függő, rugalmas nap."},{"date":"2026-09-10","day":10,"weekday":"Csü","title":"Kedvenc hely újra","subtitle":"Visszatérés a hét kedvenc programjához."},{"date":"2026-09-11","day":11,"weekday":"Pén","title":"Pihenőnap","subtitle":"Könnyű, szabadon alakítható nap."},{"date":"2026-09-12","day":12,"weekday":"Szo","title":"Utolsó teljes nap","subtitle":"Kedvenc helyek és búcsúvacsora."},{"date":"2026-09-13","day":13,"weekday":"Vas","title":"Hazautazás","subtitle":"Pakolás és indulás Cagliari felé."}],"redaction":["Nincs foglalási azonosító, voucher, cím vagy fizetési adat."]},"timeline":{"version":"0.1","trip_slug":"sardinia-family-2026","purpose":"Jóváhagyott, seedelhető induló családi terv. A seed inicializál, nem szinkronizál.","rules":["FIX, PLAN és OPEN a kezdeti terv állapotát írja le; a későbbi családi módosítás érvényes runtime adat.","A hozzávetőleges idő ~ formában, a napszak pedig saját Timeline-időpont állapotként jelenik meg.","A trip-base a privát szállásreferencia, nem public Place."],"days":[{"date":"2026-09-02","activities":[{"seed_key":"initial-2026-09-02-flight-departure","start_time":"10:35","time_precision":"exact","time_label":null,"duration_minutes":130,"title":"Repülő indulása","description":"Budapest Airport → Cagliari Airport","location_name":"Budapest Airport","place_slug":null,"planning_status":"FIX"},{"seed_key":"initial-2026-09-02-flight-arrival","start_time":"12:45","time_precision":"exact","time_label":null,"duration_minutes":1,"title":"Érkezés","description":"Érkezési marker.","location_name":"Cagliari Airport","place_slug":"cagliari-airport","planning_status":"FIX"},{"seed_key":"initial-2026-09-02-car-pickup","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Autófelvétel","description":null,"location_name":"Cagliari Airport","place_slug":"cagliari-airport","planning_status":"FIX"},{"seed_key":"initial-2026-09-02-check-in","start_time":"15:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Szállás elfoglalása","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-02-shopping","start_time":"17:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Bevásárlás","description":"Bolt még kiválasztandó.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-02-walk","start_time":"18:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Első séta","description":null,"location_name":"Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-02-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-03","activities":[{"seed_key":"initial-2026-09-03-wake","start_time":"06:45","time_precision":"exact","time_label":null,"duration_minutes":30,"title":"Ébredés","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-03-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":"Tudatos első választás: kevésbé kiemelt, családnak első osztályú strand.","location_name":"Spiaggia di Porto Sa Ruxi","place_slug":"porto-sa-ruxi","planning_status":"PLAN"},{"seed_key":"initial-2026-09-03-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-03-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-03-rest","start_time":"15:30","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Pihenés","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"PLAN"},{"seed_key":"initial-2026-09-03-gelato","start_time":"17:30","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Fagyi + séta","description":null,"location_name":"Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-03-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-04","activities":[{"seed_key":"initial-2026-09-04-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":null,"location_name":"Spiaggia di Cala Pira","place_slug":"cala-pira","planning_status":"PLAN"},{"seed_key":"initial-2026-09-04-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-04-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-04-afternoon","start_time":"16:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Könnyű délután","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-04-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-05","activities":[{"seed_key":"initial-2026-09-05-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":"Hétvégén a Castiadas irány tudatos választás.","location_name":"Spiaggia di Scoglio di Peppino","place_slug":"scoglio-di-peppino","planning_status":"PLAN"},{"seed_key":"initial-2026-09-05-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Castiadas / Costa Rei környéke, még eldöntendő.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-05-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":"Helyzettől függ.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-05-rest","start_time":"16:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Pihenős délután","description":null,"location_name":"Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-05-walk","start_time":"18:30","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Séta","description":null,"location_name":"Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-05-dinner","start_time":"19:30","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-06","activities":[]},{"date":"2026-09-07","activities":[{"seed_key":"initial-2026-09-07-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":"A népszerűbb Porto Giunco szándékosan hétköznapra került.","location_name":"Spiaggia di Porto Giunco","place_slug":"porto-giunco","planning_status":"PLAN"},{"seed_key":"initial-2026-09-07-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-07-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-07-afternoon","start_time":"16:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Könnyű délután","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-07-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-08","activities":[{"seed_key":"initial-2026-09-08-departure","start_time":"08:30","time_precision":"approximate","time_label":null,"duration_minutes":60,"title":"Indulás","description":"Szállás → Villaputzu","location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"PLAN"},{"seed_key":"initial-2026-09-08-roadtrip","start_time":"10:30","time_precision":"period","time_label":"Délelőtt","duration_minutes":60,"title":"Villaputzu roadtrip","description":null,"location_name":"Villaputzu","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-08-cafe","start_time":"10:30","time_precision":"period","time_label":"Délelőtt","duration_minutes":60,"title":"Tengerparti kávézó","description":"Kiválasztandó.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-08-library","start_time":"10:30","time_precision":"period","time_label":"Délelőtt","duration_minutes":60,"title":"Gyerekkönyvtár","description":null,"location_name":"Villaputzu","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-08-return","start_time":"12:00","time_precision":"approximate","time_label":null,"duration_minutes":60,"title":"Visszaindulás / ebéd","description":"Még eldöntendő.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-08-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-08-beach","start_time":"16:00","time_precision":"approximate","time_label":null,"duration_minutes":120,"title":"Strand","description":"Villasimius környéke, aznap választandó.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-08-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-09","activities":[{"seed_key":"initial-2026-09-09-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":null,"location_name":"Spiaggia di Solanas","place_slug":"solanas","planning_status":"PLAN"},{"seed_key":"initial-2026-09-09-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-09-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":"Helyzettől függ / szállás.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-09-afternoon","start_time":"16:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Könnyű délután","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-09-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-10","activities":[{"seed_key":"initial-2026-09-10-sight","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Nuraghe / helyi látnivaló","description":"Konkrét, gyerekkel vállalható hely kiválasztandó.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-10-lunch","start_time":"11:30","time_precision":"approximate","time_label":null,"duration_minutes":60,"title":"Ebéd / visszaindulás","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-10-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-10-beach","start_time":"16:00","time_precision":"approximate","time_label":null,"duration_minutes":120,"title":"Strand","description":"Bevált strand ismétlése rendben van.","location_name":"Spiaggia di Cala Pira","place_slug":"cala-pira","planning_status":"PLAN"},{"seed_key":"initial-2026-09-10-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-11","activities":[{"seed_key":"initial-2026-09-11-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":"Villasimius környéke, aznap választandó.","location_name":null,"place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-11-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-11-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-11-fortress","start_time":"16:00","time_precision":"approximate","time_label":null,"duration_minutes":90,"title":"Fortezza Vecchia","description":"A szeptemberi nyitvatartás később ellenőrizendő.","location_name":"Fortezza Vecchia","place_slug":"fortezza-vecchia","planning_status":"PLAN"},{"seed_key":"initial-2026-09-11-marina","start_time":"17:30","time_precision":"period","time_label":"Délután","duration_minutes":60,"title":"Kikötő / séta","description":null,"location_name":"Marina di Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-11-dinner","start_time":"19:00","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-12","activities":[{"seed_key":"initial-2026-09-12-beach","start_time":"09:00","time_precision":"exact","time_label":null,"duration_minutes":180,"title":"Strand","description":"Szándékos ismétlés, nem duplikációs hiba.","location_name":"Spiaggia di Porto Sa Ruxi","place_slug":"porto-sa-ruxi","planning_status":"PLAN"},{"seed_key":"initial-2026-09-12-lunch","start_time":"12:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Ebéd","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"},{"seed_key":"initial-2026-09-12-nap","start_time":"13:00","time_precision":"exact","time_label":null,"duration_minutes":120,"title":"Enikő alszik","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-12-pack","start_time":"15:30","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Pihenés / csomagolás","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"PLAN"},{"seed_key":"initial-2026-09-12-gelato","start_time":"17:30","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Utolsó fagyi + séta","description":null,"location_name":"Villasimius","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-12-dinner","start_time":"19:30","time_precision":"exact","time_label":null,"duration_minutes":90,"title":"Utolsó vacsora","description":"Még nincs eldöntve.","location_name":null,"place_slug":null,"planning_status":"OPEN"}]},{"date":"2026-09-13","activities":[{"seed_key":"initial-2026-09-13-checkout","start_time":"10:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Check-out","description":null,"location_name":"Ollastu Apartments","place_slug":"trip-base","planning_status":"FIX"},{"seed_key":"initial-2026-09-13-poetto","start_time":"11:00","time_precision":"approximate","time_label":null,"duration_minutes":120,"title":"Strand","description":"Poetto, Cagliari.","location_name":"Poetto","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-13-lunch","start_time":"13:00","time_precision":"approximate","time_label":null,"duration_minutes":60,"title":"Ebéd","description":null,"location_name":"Poetto","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-13-shower","start_time":"14:30","time_precision":"approximate","time_label":null,"duration_minutes":30,"title":"Zuhany + átöltözés","description":"Konkrét stabilimento később.","location_name":"Poetto","place_slug":null,"planning_status":"PLAN"},{"seed_key":"initial-2026-09-13-airport-departure","start_time":"15:00","time_precision":"approximate","time_label":null,"duration_minutes":60,"title":"Indulás a reptérre","description":"Poetto → Cagliari Airport","location_name":"Cagliari Airport","place_slug":"cagliari-airport","planning_status":"PLAN"},{"seed_key":"initial-2026-09-13-car-return","start_time":"16:00","time_precision":"exact","time_label":null,"duration_minutes":60,"title":"Autóleadás","description":null,"location_name":"Cagliari Airport","place_slug":"cagliari-airport","planning_status":"FIX"},{"seed_key":"initial-2026-09-13-flight-departure","start_time":"17:30","time_precision":"exact","time_label":null,"duration_minutes":125,"title":"Repülő indulása","description":"Cagliari Airport → Budapest Airport","location_name":"Cagliari Airport","place_slug":"cagliari-airport","planning_status":"FIX"},{"seed_key":"initial-2026-09-13-flight-arrival","start_time":"19:35","time_precision":"exact","time_label":null,"duration_minutes":1,"title":"Érkezés","description":"Érkezési marker.","location_name":"Budapest Airport","place_slug":null,"planning_status":"FIX"}]}]},"events":{"version":"1.0","updated_at":"2026-08-08","source_dataset":"utazasi_data_codex_v1.4","rules":["Az Event külön entitás a Place-től.","Csak a 2026-09-02 és 2026-09-13 közötti utazáshoz releváns, ténylegesen meghirdetett 2026-os esemény lehet itt.","A place_slug csak ismert helyazonosság esetén tölthető ki."],"events":[{"id":"event_invaso_festival_muravera_2026","title":"InVaso Festival 2026","starts_at":"2026-08-31T00:00:00+02:00","ends_at":"2026-09-06T23:59:59+02:00","source_url":"https://www.invasofestival.com/","organizer":null,"status":"confirmed","place_slug":null,"metadata":{"category":"cultural_festival","location":{"city":"Muravera","area":"városi terek és szabadtéri helyszínek"},"family":{"suitable_for_toddler":null,"crowd_warning":true,"notes":"A napi részletes program és az egyes előadások korhatára még nincs közzétéve; indulás előtt újra ellenőrzendő."},"admission":{"status":"not_yet_verified_for_2026","price":null},"verification":{"status":"confirmed_2026","last_checked":"2026-08-08","sources":["https://www.invasofestival.com/","https://www.invasofestival.com/about/","https://www.invasofestival.com/call-for-artists/","https://www.unionesarda.it/news-sardegna/provincia-cagliari/muravera-ad-agosto-ritorna-l-isola-pedonale-lungo-la-via-roma-rn2bwc7p"]}}}]}}$utazasi_seed$::jsonb);

with source as (
  select payload -> 'trip' as trip from _utazasi_seed
)
insert into public.trips (slug, name, destination, start_date, end_date)
select
  trip ->> 'slug',
  trip ->> 'name',
  trip #>> '{destination,name}',
  (trip #>> '{dates,start}')::date,
  (trip #>> '{dates,end}')::date
from source
on conflict (slug) do update set
  name = excluded.name,
  destination = excluded.destination,
  start_date = excluded.start_date,
  end_date = excluded.end_date;

with source as (
  select payload -> 'trip' as trip from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select trip ->> 'slug' from source)
), day_source as (
  select jsonb_array_elements((select trip -> 'days' from source)) as day
)
insert into public.days (trip_id, date, title, subtitle)
select
  current_trip.id,
  (day ->> 'date')::date,
  day ->> 'title',
  day ->> 'subtitle'
from day_source cross join current_trip
on conflict (trip_id, date) do update set
  title = excluded.title,
  subtitle = excluded.subtitle;

-- Explicit one-time replacement of the old Sep 3 fixture. Once the fixture
-- seed keys are gone, later reruns leave Sep 3 family edits intact.
do $$
declare
  current_trip_id uuid;
  sep3_day_id uuid;
  legacy_fixture_exists boolean;
begin
  select id into current_trip_id from public.trips where slug = 'sardinia-family-2026';
  select id into sep3_day_id from public.days where trip_id = current_trip_id and date = date '2026-09-03';
  select exists (
    select 1 from public.timeline_activities
    where seed_key in (
      '2026-09-03-wake', '2026-09-03-beach', '2026-09-03-lunch',
      '2026-09-03-nap', '2026-09-03-gelato', '2026-09-03-dinner'
    )
  ) into legacy_fixture_exists;

  if legacy_fixture_exists then
    delete from public.timeline_activities where day_id = sep3_day_id;
  end if;

  delete from public.timeline_activities
  where seed_key in (
    'trip-core-outbound-flight', 'trip-core-accommodation-check-in',
    'trip-core-accommodation-check-out', 'trip-core-return-flight'
  );
end;
$$;

with source as (
  select payload as data from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select data #>> '{trip,slug}' from source)
), activity_source as (
  select
    (day ->> 'date')::date as activity_date,
    activity
  from source,
    lateral jsonb_array_elements(data #> '{timeline,days}') as day,
    lateral jsonb_array_elements(day -> 'activities') as activity
)
insert into public.timeline_activities (
  day_id, seed_key, start_time, start_time_precision, time_label,
  duration_minutes, title, description, location_name, place_slug,
  kind, is_system_generated
)
select
  days.id,
  activity ->> 'seed_key',
  (activity ->> 'start_time')::time,
  (activity ->> 'time_precision')::public.timeline_time_precision,
  activity ->> 'time_label',
  (activity ->> 'duration_minutes')::integer,
  activity ->> 'title',
  activity ->> 'description',
  activity ->> 'location_name',
  activity ->> 'place_slug',
  'plan'::public.timeline_activity_kind,
  false
from activity_source
join current_trip on true
join public.days on days.trip_id = current_trip.id and days.date = activity_source.activity_date
on conflict (seed_key) do nothing;

with source as (
  select payload as data from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select data #>> '{trip,slug}' from source)
), event_source as (
  select jsonb_array_elements(data #> '{events,events}') as event from source
)
insert into public.events (
  trip_id, canonical_key, title, starts_at, ends_at, organizer,
  source_url, status, place_slug, last_verified_at
)
select
  current_trip.id,
  event ->> 'id',
  event ->> 'title',
  (event ->> 'starts_at')::timestamptz,
  nullif(event ->> 'ends_at', '')::timestamptz,
  event ->> 'organizer',
  event ->> 'source_url',
  case when event ->> 'status' = 'cancelled' then 'cancelled'::public.event_status else 'scheduled'::public.event_status end,
  event ->> 'place_slug',
  (nullif(event #>> '{metadata,verification,last_checked}', '') || 'T00:00:00+02:00')::timestamptz
from event_source cross join current_trip
on conflict (trip_id, canonical_key) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  organizer = excluded.organizer,
  source_url = excluded.source_url,
  status = excluded.status,
  place_slug = excluded.place_slug,
  last_verified_at = excluded.last_verified_at;

insert into public.event_watch_states (
  event_id, enabled, baseline_status, baseline_starts_at, baseline_place_slug,
  last_checked_at, last_success_at
)
select
  events.id, true, events.status, events.starts_at, events.place_slug,
  events.last_verified_at, events.last_verified_at
from public.events
join public.trips on trips.id = events.trip_id
where trips.slug = 'sardinia-family-2026'
  and events.source_url is not null
  and events.last_verified_at is not null
on conflict (event_id) do nothing;

-- Verification result: exactly 12 days, with their current activity totals.
select days.date, days.title, count(timeline_activities.id) as timeline_activity_count
from public.days
join public.trips on trips.id = days.trip_id
left join public.timeline_activities on timeline_activities.day_id = days.id
where trips.slug = 'sardinia-family-2026'
group by days.date, days.title
order by days.date;

commit;
