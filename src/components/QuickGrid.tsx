import Link from "next/link";
import { QUICK_LINKS } from "@/data/quickLinks";
import { Icon } from "./Icon";

export function QuickGrid() {
  return (
    <div className="mb-4 grid grid-cols-4 gap-2.5">
      {QUICK_LINKS.map((q) => (
        <Link
          key={q.target}
          href={q.target}
          className="flex flex-col items-center gap-1.5 rounded-ui-s bg-white px-1.5 py-3.5 text-center text-xs text-deep-sea shadow-sm"
        >
          <Icon name={q.icon} size={22} />
          <span>{q.label}</span>
        </Link>
      ))}
    </div>
  );
}
