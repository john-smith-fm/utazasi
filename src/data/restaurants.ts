import type { Restaurant, Playground } from "@/types";

export const RESTAURANTS: Restaurant[] = [
  {
    name: "Sa Tankitta",
    photo: "/images/sa-tankitta.jpg",
    priceRange: "€€",
    maps: "https://www.google.com/maps/search/?api=1&query=Sa+Tankitta+Villasimius",
    reservation: "Ajánlott foglalni, különösen vacsorára főszezonban.",
    recommended: "Tenger gyümölcsei, polip, kagyló, klasszikus olasz tészták és pizzák.",
    kidFriendly: true,
    mateAjanlja: "Korán nyit, ami kisgyerekes vacsorához kifejezetten kényelmes.",
  },
  {
    name: "Le Pavoncelle",
    photo: "/images/le-pavoncelle.jpg",
    priceRange: "€€€",
    maps: "https://www.google.com/maps/search/?api=1&query=Le+Pavoncelle+Villasimius",
    reservation: "Foglalás javasolt, igényesebb, lassabb tempójú vacsorához.",
    recommended: "Helyi, kissé megemelt szintű konyha, széles borválaszték.",
    kidFriendly: false,
    mateAjanlja: "Inkább egy nyugodt, kettesben elköltött vacsorára való, mint családi rohanásra.",
  },
  {
    name: "Galika",
    photo: "/images/galika.jpg",
    priceRange: "€€",
    maps: "https://www.google.com/maps/search/?api=1&query=Galika+Villasimius",
    reservation: "Ajánlott, elsősorban hétvégi estékre.",
    recommended: "Húsos fogások (marha, bárány), jó választás, ha megunjátok a halat.",
    kidFriendly: true,
    mateAjanlja: "Kicsit kívül esik a központon, de kifejezetten gyerekbarát a hangulata.",
  },
];

export const PLAYGROUNDS: Playground[] = [
  {
    name: "Villasimius központi játszótér",
    photo: "/images/jatszoter-kozpont.jpg",
    maps: "https://www.google.com/maps/search/?api=1&query=parco+giochi+Villasimius+centro",
    distance: "Sétatávolság a központból.",
    shade: "Részben árnyékolt, késő délután kellemes.",
    fountain: true,
    toilet: false,
  },
  {
    name: "Simius sétány menti játszótér",
    photo: "/images/jatszoter-simius.jpg",
    maps: "https://www.google.com/maps/search/?api=1&query=parco+giochi+lungomare+Simius+Villasimius",
    distance: "A Simius strand sétányához közel.",
    shade: "Kevés árnyék, inkább reggel vagy késő délután ideális.",
    fountain: true,
    toilet: true,
  },
];
