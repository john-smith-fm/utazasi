"use client";

import { lazy, Suspense, type ComponentProps } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

type LucideProps = ComponentProps<"svg"> & { size?: number | string; strokeWidth?: number };

interface IconProps extends LucideProps {
  /** kebab-case Lucide icon name, e.g. "sunrise", "book-open" — lásd lucide.dev/icons */
  name: string;
  className?: string;
}

/**
 * Adat-vezérelt ikon-feloldó: a data/ rétegben (rhythms.ts, quickLinks.ts stb.) minden
 * ikon egy kebab-case string (Lucide ikonnév). Ez a komponens ebből dinamikusan
 * betölti a megfelelő Lucide SVG-t. Ismeretlen névnél csendben semmit nem renderel,
 * ahelyett hogy elszállna az egész alkalmazás.
 *
 * DESIGN_SYSTEM.md: "Icons: Lucide only. No emoji."
 */
export function Icon({ name, size = 18, strokeWidth = 2, className, ...rest }: IconProps) {
  const importFn = dynamicIconImports[name as keyof typeof dynamicIconImports];
  if (!importFn) return null;

  const LucideIcon = lazy(importFn);

  return (
    <Suspense fallback={<span style={{ display: "inline-block", width: size, height: size }} />}>
      <LucideIcon size={size} strokeWidth={strokeWidth} className={className} {...rest} />
    </Suspense>
  );
}
