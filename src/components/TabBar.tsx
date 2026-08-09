"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/beaches", label: "Strandok", icon: "umbrella" },
  { href: "/restaurants", label: "Éttermek", icon: "utensils" },
  { href: "/budget", label: "Költségek", icon: "wallet" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[30] flex border-t px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-glass"
      style={{
        backgroundColor: "rgba(255,255,255,0.65)",
        borderColor: "rgba(255,255,255,0.55)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-[3px] py-1 text-[10px] ${
              active ? "text-turquoise" : "text-neutral-700"
            }`}
            aria-current={active ? "true" : undefined}
          >
            <span className="h-[22px] w-[22px]">
              <Icon name={tab.icon} size={22} />
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
