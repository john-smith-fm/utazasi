import type { Trip } from "@/types";

export const TRIP: Trip = {
  name: "Utazási — Villasimius Guide",
  family: ["Máté", "Nóra", "Enikő"],
  destination: "Villasimius, Szardínia",
  coords: { lat: 39.1372, lon: 9.5313 },
  timezone: "Europe/Rome",

  flights: {
    out: { from: "Budapest", to: "Cagliari", date: "2026-09-02", dep: "10:35", arr: "12:45", code: "FR5248" },
    back: { from: "Cagliari", to: "Budapest", date: "2026-09-13", dep: "17:30", arr: "19:35", code: "FR5249" },
  },

  apartment: {
    name: "Ollastu Apartments Villasimius",
    checkinFrom: "15:00",
    checkoutUntil: "10:00",
  },

  car: {
    model: "Citroen C3 (vagy hasonló)",
    gearbox: "Automata",
    extras: ["Gyerekülés"],
    pickup: { place: "Cagliari repülőtér", date: "2026-09-02", time: "13:00" },
    dropoff: { place: "Cagliari repülőtér", date: "2026-09-13", time: "16:00" },
  },

  startDate: "2026-09-02",
  endDate: "2026-09-13",

  homeCurrency: "HUF",
  localCurrency: "EUR",
};
