import shoppingIntelligence from "../../knowledge/shopping-intelligence.json";
import { getPlaceBySlug } from "./places";
import { detectShoppingIntent, type ShoppingIntent } from "./shopping-intent";

type Candidate = {
  place_slug: string;
  confidence?: string;
  reason?: string;
  caveat?: string;
  confirmed?: string[];
};

type DecisionProfile = {
  status?: string;
  note?: string;
  ranked_candidates?: Candidate[];
  candidates?: Candidate[];
};

export type ShoppingRecommendation = {
  placeSlug: string;
  name: string;
  rationale?: string;
  matchedProfile: Exclude<ShoppingIntent, "mobility">;
  confirmedFacts: string[];
  uncertainty?: string;
  rankingStatus: string;
  confidence?: string;
  placeDetailHref: string;
};

export type ShoppingAnswer = {
  title: string;
  body: string;
  sources: string[];
  intent: ShoppingIntent;
  status: string;
  recommendations: ShoppingRecommendation[];
};

const decisions = shoppingIntelligence.decision_support as Record<string, DecisionProfile>;

const FACT_LABELS: Record<string, string> = {
  fresh_bakery: "Pékség",
  fresh_fruit: "Zöldség-gyümölcs",
  fresh_fish: "Halas részleg",
  butcher: "Hentes",
  gastronomy: "Gasztronómia",
  wine: "Borválaszték",
  parking: "Parkolás",
  barrier_free: "Akadálymentes hozzáférés",
};

/**
 * The Timeline place picker uses the same approved Shopping Intelligence
 * profiles as Kérdezési, but exposes candidates rather than a prose answer.
 * Unknown baby-product coverage deliberately returns no shop recommendation.
 */
export function getShoppingPlaceCandidates(title: string): { recommended: Array<{ place: NonNullable<ReturnType<typeof getPlaceBySlug>>; rationale?: string }>; additional: Array<{ place: NonNullable<ReturnType<typeof getPlaceBySlug>>; rationale?: string }> } | null {
  const intent = detectShoppingIntent(title);
  if (!intent || intent === "mobility" || intent === "baby_products") return intent === "baby_products" ? { recommended: [], additional: [] } : null;
  const profileName = intent === "arrival_shopping" || intent === "quick_stop" || intent === "local_products" || intent === "daily_groceries"
    ? intent
    : "daily_groceries";
  const profile = decisions[profileName];
  if (!profile) return null;
  const seen = new Set<string>();
  const candidates = (profile.ranked_candidates ?? profile.candidates ?? []).flatMap((candidate) => {
    const place = getPlaceBySlug(candidate.place_slug);
    if (!place || seen.has(place.slug)) return [];
    seen.add(place.slug);
    return [{ place, rationale: candidate.reason }];
  });
  return { recommended: candidates.slice(0, 5), additional: candidates.slice(5) };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function confirmedFactsFor(placeSlug: string, candidate: Candidate) {
  const place = getPlaceBySlug(placeSlug);
  if (!place) return [];

  const details = record(place.intelligence?.details);
  const shopping = record(details?.shopping);
  const inventory = record(shopping?.inventory);
  const facts = new Set<string>();

  candidate.confirmed?.forEach((key) => {
    if (FACT_LABELS[key]) facts.add(FACT_LABELS[key]);
  });

  Object.entries(inventory ?? {}).forEach(([key, status]) => {
    if (status === "confirmed" && FACT_LABELS[key]) facts.add(FACT_LABELS[key]);
  });

  const services = Array.isArray(details?.services) ? details?.services : [];
  services.forEach((service) => {
    if (typeof service === "string" && FACT_LABELS[service]) facts.add(FACT_LABELS[service]);
  });

  const family = record(shopping?.family);
  if (family?.parking === "confirmed") facts.add(FACT_LABELS.parking);
  return [...facts];
}

function recommendationsFor(profileName: Exclude<ShoppingIntent, "mobility" | "baby_products">, profile: DecisionProfile) {
  const candidates = profile.ranked_candidates ?? profile.candidates ?? [];
  return candidates.slice(0, 3).flatMap((candidate) => {
    const place = getPlaceBySlug(candidate.place_slug);
    if (!place) return [];
    return [{
      placeSlug: place.slug,
      name: place.name,
      rationale: candidate.reason,
      matchedProfile: profileName,
      confirmedFacts: confirmedFactsFor(place.slug, candidate),
      uncertainty: candidate.caveat ?? profile.note,
      rankingStatus: profile.status ?? "ranked",
      confidence: candidate.confidence,
      placeDetailHref: `/places/${place.slug}`,
    } satisfies ShoppingRecommendation];
  });
}

function mobilityAnswer(): ShoppingAnswer {
  return {
    title: "Nincs ellenőrzött útvonaladat",
    body: "Ehhez a bolthoz még nincs jóváhagyott Mobility-route. Ezért nem mondok km-t, percet vagy kerülőt.",
    sources: ["Mobility"],
    intent: "mobility",
    status: "unknown",
    recommendations: [],
  };
}

function babyProductsAnswer(profile: DecisionProfile): ShoppingAnswer {
  return {
    title: "A babatermékekről nincs biztos adat",
    body: profile.note ?? "Egyetlen konkrét Villasimius-üzlet babatermék-készlete sincs megbízhatóan megerősítve. Nem ajánlok találomra boltot.",
    sources: ["Shopping Intelligence"],
    intent: "baby_products",
    status: profile.status ?? "unknown",
    recommendations: [],
  };
}

const COPY: Record<Exclude<ShoppingIntent, "mobility" | "baby_products">, { title: string; body: string }> = {
  arrival_shopping: {
    title: "Érkezés utáni nagybevásárlás",
    body: "A jelenlegi adatok alapján ez egy előzetes rangsor. Az Airport → bolt → szállás útvonal nincs ellenőrzött Mobility-adatként rögzítve, ezért nem hasonlítok menetidőt vagy kerülőt.",
  },
  daily_groceries: {
    title: "Napi bevásárlás",
    body: "A jelenlegi lista ellenőrzött bolti adatokból áll. Helyfüggő sorrendet vagy menetidőt még nem állítok.",
  },
  quick_stop: {
    title: "Gyors bevásárlás",
    body: "A jelöltek üzlettípus és ismert nyitvatartás alapján relevánsak. A végleges sorrend a tartózkodási helytől és jóváhagyott route-adattól függ.",
  },
  local_products: {
    title: "Helyi termékek",
    body: "Ez egy óvatos jelölt: a hálózat helyi termékprofilja ismert, de az adott villasimiusi üzlet pontos készlete nincs megerősítve.",
  },
};

/**
 * Resolves a small, deterministic shopping-intelligence answer from approved
 * data only. A null result deliberately hands the question back to the
 * existing Kérdezési fallback.
 */
export function getShoppingAnswer(question: string): ShoppingAnswer | null {
  const intent = detectShoppingIntent(question);
  if (!intent) return null;
  if (intent === "mobility") return mobilityAnswer();

  const profile = decisions[intent];
  if (!profile) return null;
  if (intent === "baby_products") return babyProductsAnswer(profile);

  const recommendations = recommendationsFor(intent, profile);
  if (!recommendations.length) return null;
  const copy = COPY[intent];
  return {
    title: copy.title,
    body: copy.body,
    sources: ["Shopping Intelligence", "Place"],
    intent,
    status: profile.status ?? "ranked",
    recommendations,
  };
}
