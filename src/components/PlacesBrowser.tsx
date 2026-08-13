"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlaceListItem } from "@/components/PlaceListItem";
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
    setCategoryId(nextCategory);
    router.replace(placeBrowseHref(nextCategory), { scroll: false });
  }

  return (
    <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-turquoise-dark">Villasimius környéke</p>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-deep-sea">Helyek</h1>
      </header>

      <div className="mt-5 grid grid-cols-4 gap-1 border-b border-deep-sea/10 pb-2" role="tablist" aria-label="Helytípusok">
        {PLACE_BROWSE_CATEGORIES.map((item) => {
          const active = item.id === categoryId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeCategory(item.id)}
              className={`min-h-11 rounded-[18px] px-1 text-center text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-turquoise-dark ${
                active ? "bg-turquoise/10 text-deep-sea" : "text-deep-sea/55"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="mt-2" role="tabpanel" aria-label={category.label}>
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
