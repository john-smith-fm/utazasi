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
  navigation?: PlaceNavigation;
  details: BeachDetails | RestaurantDetails | GenericPlaceDetails;
};

export type BeachPlace = Place & { type: "beach"; details: BeachDetails };
export type RestaurantPlace = Place & { type: "restaurant"; details: RestaurantDetails };
