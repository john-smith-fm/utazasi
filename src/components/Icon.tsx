"use client";

import { lazy, Suspense, type ComponentPropsWithoutRef } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

type LucideProps = ComponentPropsWithoutRef<"svg"> & { size?: number | string; strokeWidth?: number };

interface IconProps extends LucideProps {
  name: string;
  className?: string;
}

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
