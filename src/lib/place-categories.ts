import type { PlaceType } from "@/types/places";

export type PlaceBrowseCategoryId = "beaches" | "food" | "shopping" | "activities";

export type PlaceBrowseCategory = {
  id: PlaceBrowseCategoryId;
  label: string;
  types: readonly PlaceType[];
};

/** User-facing groups deliberately differ from technical Place types. */
export const PLACE_BROWSE_CATEGORIES: readonly PlaceBrowseCategory[] = [
  { id: "beaches", label: "Strandok", types: ["beach"] },
  { id: "food", label: "Nyami", types: ["restaurant", "cafe"] },
  { id: "shopping", label: "Boltok", types: ["shop"] },
  { id: "activities", label: "Programok", types: ["playground", "sight", "parking", "other"] },
];

export const DEFAULT_PLACE_BROWSE_CATEGORY: PlaceBrowseCategoryId = "beaches";

export function isPlaceBrowseCategory(value: string | null | undefined): value is PlaceBrowseCategoryId {
  return PLACE_BROWSE_CATEGORIES.some((category) => category.id === value);
}

export function placeBrowseHref(category: PlaceBrowseCategoryId = DEFAULT_PLACE_BROWSE_CATEGORY) {
  return "/places?category=" + category;
}

export function placeBrowseCategoryForType(type: PlaceType): PlaceBrowseCategoryId {
  return PLACE_BROWSE_CATEGORIES.find((category) => category.types.includes(type))?.id ?? DEFAULT_PLACE_BROWSE_CATEGORY;
}
