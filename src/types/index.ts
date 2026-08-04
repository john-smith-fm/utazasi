export type DayType = "utazas-oda" | "utazas-vissza" | "apartman" | "strand";

export type RhythmKey =
  | "erkezes"
  | "hazautazas"
  | "apartman"
  | "egeszNapos";

export interface RhythmBlock {
  key: string;
  label: string;
  /** Lucide icon name (see https://lucide.dev/icons) */
  icon: string;
  time: string;
  text: string;
}

export interface Day {
  date: string; // YYYY-MM-DD
  type: DayType;
  title: string;
  mood: string;
  rhythm: RhythmKey;
  beach?: string;
}

export interface Beach {
  name: string;
  photo: string;
  maps: string;
  parking: string;
  price: string;
  umbrella: boolean;
  sunbed: boolean;
  toilet: boolean;
  shower: boolean;
  waves: string;
  sand: string;
  wind: string;
  goWhen: string;
  avoidWhen: string;
  enikoIndex: string;
  mateAjanlja: string;
}

export interface Restaurant {
  name: string;
  photo: string;
  priceRange: string;
  maps: string;
  reservation: string;
  recommended: string;
  kidFriendly: boolean;
  mateAjanlja: string;
}

export interface Playground {
  name: string;
  photo: string;
  maps: string;
  distance: string;
  shade: string;
  fountain: boolean;
  toilet: boolean;
}

export interface QuickLink {
  label: string;
  icon: string;
  target: string; // route path, e.g. "/days"
}

export interface Trip {
  name: string;
  family: string[];
  destination: string;
  coords: { lat: number; lon: number };
  timezone: string;
  flights: {
    out: { from: string; to: string; date: string; dep: string; arr: string; code: string };
    back: { from: string; to: string; date: string; dep: string; arr: string; code: string };
  };
  apartment: { name: string; checkinFrom: string; checkoutUntil: string };
  car: {
    model: string;
    gearbox: string;
    extras: string[];
    pickup: { place: string; date: string; time: string };
    dropoff: { place: string; date: string; time: string };
  };
  startDate: string;
  endDate: string;
  homeCurrency: string;
  localCurrency: string;
}

export interface Expense {
  name: string;
  amount: number;
  date: string;
}

export interface PackingItem {
  name: string;
  checked: boolean;
}

export interface JournalEntry {
  date: string;
  note: string;
  rating: number;
}

export interface WeatherSnapshot {
  temp: number;
  wind: number;
  uv: number;
  sunrise: string;
  sunset: string;
}
