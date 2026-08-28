"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Timeline-ból nyitva explicit visszatérési cím érkezik, így a szerkesztő
 * állapota nem függ a böngésző route-cache-étől.
 */
export function PlaceBackButton({ fallbackHref, returnTo, label }: { fallbackHref: string; returnTo?: string; label: string }) {
  const router = useRouter();

  function goBack() {
    if (returnTo) router.push(returnTo);
    else if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-turquoise bg-transparent px-4 text-sm font-semibold text-deep-sea outline-none transition-colors hover:bg-turquoise/10 focus-visible:ring-2 focus-visible:ring-turquoise-dark">
    <Icon name="arrow-left" size={16} aria-hidden="true" />
    {label}
  </button>;
}
