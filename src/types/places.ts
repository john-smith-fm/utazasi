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

export type BeachDetails = {
  kind: "beach";
  access?: BeachAccess;
};

export type RestaurantContact = {
  phones?: string[];
  website?: string;
};

export type RestaurantDetails = {
  kind: "restaurant";
  openingNote?: string;
  contact?: RestaurantContact;
};

export type GenericPlaceDetails = {
  kind: Exclude<PlaceType, "beach" | "restaurant">;
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
  details: BeachDetails | RestaurantDetails | GenericPlaceDetails;
};

export type BeachPlace = Place & { type: "beach"; details: BeachDetails };
export type RestaurantPlace = Place & { type: "restaurant"; details: RestaurantDetails };
