export type PlaceType = "beach" | "restaurant" | "cafe" | "playground" | "shop" | "sight" | "parking" | "other";

export type PlaceLocation = {
  locality?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export type PlaceProvenance = {
  sourceUrls?: string[];
  reviewedAt?: string;
  reviewStatus?: string;
  uncertaintyNote?: string;
};

export type PlaceNavigation = {
  mapsUrl?: string;
  directionsUrl?: string;
};

/** Contact details are rendered only when the canonical Place record contains
 * an explicit, source-backed value. */
export type PlaceContact = {
  phones?: string[];
  website?: string;
};

/** Source-backed enrichment kept with the canonical Place, even when the
 * current screen does not yet render every field. */
export type PlaceIntelligence = {
  checkedAt?: string;
  coverage?: Record<string, string>;
  openQuestions?: string[];
  coverImage?: {
    assetUrl?: string;
    sourceUrl?: string;
    sourceType?: string;
    license?: string;
    attribution?: string;
    checkedAt?: string;
  };
  supportingVisuals?: Array<{
    role?: string;
    assetUrl?: string;
    sourceUrl?: string;
    sourceType?: string;
    license?: string;
    attribution?: string;
    checkedAt?: string;
    captureDate?: string;
    observation?: string;
  }>;
  evidence?: Array<{
    sourceType?: string;
    url?: string;
    supports?: string[];
    checkedAt?: string;
  }>;
  details?: Record<string, unknown>;
};

export type BeachAccess = {
  characteristics?: string[];
  serpentineRoad?: boolean;
  dirtRoad?: boolean;
  mainRoad?: boolean;
  coastalRoad?: boolean;
  parkingNotes?: string;
  notes?: string;
};

/** Directly mapped from the canonical destination_intelligence.parking
 * record. Omitted values mean that the canonical source does not confirm it. */
export type BeachParking = {
  available?: boolean;
  paid?: boolean;
  seasonal?: boolean;
  walkDistanceM?: number;
  notes?: string;
};

export type BeachDetails = {
  kind: "beach";
  shoreType?: "sandy" | "pebbly" | "rocky";
  lengthM?: number;
  landAccess?: "easy" | "moderate" | "hard" | "no_access";
  waterEntry?: string;
  shallowWater?: boolean;
  windExposure?: string;
  access?: BeachAccess;
  parking?: BeachParking;
  confirmedServices?: string[];
  familyInsight?: string;
};

export type RestaurantContact = {
  phones?: string[];
  website?: string;
};

export type RestaurantDetails = {
  kind: "restaurant";
  mealProfiles?: string[];
  cuisine?: string[];
  openingNote?: string;
  contact?: RestaurantContact;
};

export type GenericPlaceDetails = {
  kind: Exclude<PlaceType, "beach" | "restaurant">;
  /** Source-backed parking facts for a dedicated parking Place. Strings stay
   * verbatim when the canonical source gives a tariff or charging window. */
  parking?: {
    available?: boolean;
    paid?: boolean;
    chargingWindow?: string;
    price?: string;
  };
  food?: {
    mealProfiles?: string[];
    cuisine?: string[];
  };
  confirmedServices?: string[];
  familyInsight?: string;
  openingHours?: string[];
  openingNote?: string;
  shop?: {
    openingHours?: string;
    openingNote?: string;
    phones?: string[];
    website?: string;
    services?: string[];
    confirmedDepartments?: string[];
    familyInsight?: string;
  };
};

export type Place = {
  sourceId: string;
  slug: string;
  name: string;
  type: PlaceType;
  location?: PlaceLocation;
  shortDescription?: string;
  description?: string;
  media?: { src: string; attribution?: string }[];
  provenance?: PlaceProvenance;
  intelligence?: PlaceIntelligence;
  navigation?: PlaceNavigation;
  contact?: PlaceContact;
  details: BeachDetails | RestaurantDetails | GenericPlaceDetails;
};

export type BeachPlace = Place & { type: "beach"; details: BeachDetails };
export type RestaurantPlace = Place & { type: "restaurant"; details: RestaurantDetails };
