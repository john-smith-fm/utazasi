import type { HomeActivity, HomeDay } from "@/data/home-days";

export type DayDisplayContext = {
  title: string;
  summary: string;
  isFallback: boolean;
};

function pluralPrograms(count: number): string {
  return count === 1 ? "program" : "program";
}

function activityLine(activity: HomeActivity): string {
  const time = /^\d{2}:\d{2}$/.test(activity.time) ? `${activity.time} · ` : "";
  return `${time}${activity.title}${activity.place ? ` · ${activity.place}` : ""}`;
}

/**
 * The Trip-core title/subtitle describe an empty, planned day. Once the
 * canonical Timeline contains activities, the visible day context must be
 * derived from those activities instead of becoming stale editorial copy.
 * This is deliberately a read-only projection: it never changes Timeline
 * rows or the family's authored Trip metadata.
 */
export function dayDisplayContext(day: HomeDay): DayDisplayContext {
  const activities = day.activities.filter((activity) => activity.title.trim());

  if (!activities.length) {
    return { title: day.title, summary: day.summary, isFallback: true };
  }

  const visible = activities.slice(0, 3).map(activityLine);
  const remaining = activities.length - visible.length;
  const tail = remaining > 0 ? ` · +${remaining} további` : "";

  return {
    title: `Napi terv · ${activities.length} ${pluralPrograms(activities.length)}`,
    summary: `${visible.join(" · ")}${tail}`,
    isFallback: false,
  };
}
