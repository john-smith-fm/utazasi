"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlaceListItem } from "@/components/PlaceListItem";
import { FolderTabs } from "@/components/FolderTabs";
import { Icon } from "@/components/Icon";
import {
  DEFAULT_PLACE_BROWSE_CATEGORY,
  isPlaceBrowseCategory,
  PLACE_BROWSE_CATEGORIES,
  placeBrowseHref,
  type PlaceBrowseCategoryId,
} from "@/lib/place-categories";
import { getPlaces } from "@/lib/places";
import { storageGet, storageSet } from "@/lib/storage";

const CATEGORY_STORAGE_KEY = "places-active-category-v1";

function resolveInitialCategory(value: string | null): PlaceBrowseCategoryId {
  if (isPlaceBrowseCategory(value)) return value;
  return storageGet(CATEGORY_STORAGE_KEY, DEFAULT_PLACE_BROWSE_CATEGORY);
}

export function PlacesBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const [categoryId, setCategoryId] = useState<PlaceBrowseCategoryId>(() => resolveInitialCategory(requestedCategory));
  const [transition, setTransition] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    if (isPlaceBrowseCategory(requestedCategory) && requestedCategory !== categoryId) {
      setCategoryId(requestedCategory);
    }
  }, [categoryId, requestedCategory]);

  useEffect(() => {
    storageSet(CATEGORY_STORAGE_KEY, categoryId);
  }, [categoryId]);

  const category = PLACE_BROWSE_CATEGORIES.find((item) => item.id === categoryId) ?? PLACE_BROWSE_CATEGORIES[0];
  const places = useMemo(
    () => getPlaces().filter((place) => category.types.includes(place.type)),
    [category],
  );

  function changeCategory(nextCategory: PlaceBrowseCategoryId) {
    if (nextCategory === categoryId) return;
    setTransition(PLACE_BROWSE_CATEGORIES.findIndex((item) => item.id === nextCategory) > PLACE_BROWSE_CATEGORIES.findIndex((item) => item.id === categoryId) ? "forward" : "backward");
    setCategoryId(nextCategory);
    router.replace(placeBrowseHref(nextCategory), { scroll: false });
  }

  return (
    <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="flex justify-center pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <h1 className="flex items-center gap-2 text-[28px] font-semibold tracking-[-0.03em] text-turquoise">
          <Icon name="map-pin" size={27} strokeWidth={2} aria-hidden="true" />
          Helyek
        </h1>
      </header>

      <div className="mt-5"><FolderTabs items={PLACE_BROWSE_CATEGORIES} activeId={categoryId} onChange={changeCategory} ariaLabel="Helytípusok" variant="places" /></div>

      <section key={categoryId} className={`folder-content-surface folder-content-surface--places mt-0 ${transition === "forward" ? "view-transition-forward" : "view-transition-backward"}`} role="tabpanel" aria-label={category.label}>
        {places.length ? (
          places.map((place) => (
            <PlaceListItem
              key={place.slug}
              place={place}
              href={`/places/${place.slug}?category=${categoryId}`}
            />
          ))
        ) : (
          <p className="py-10 text-center text-sm leading-6 text-deep-sea/60">Ebben a kategóriában még nincs jóváhagyott hely.</p>
        )}
      </section>
    </main>
  );
}
