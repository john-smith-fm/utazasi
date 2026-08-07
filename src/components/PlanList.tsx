import type { HomeActivity } from "@/data/home-days";
import type { TimelineLoadState } from "@/hooks/useTimelineDay";

function timeToMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function hasConflict(activities: HomeActivity[], index: number) {
  const currentStart = timeToMinutes(activities[index].time);
  if (currentStart === null) return false;

  return activities.slice(0, index).some((activity) => {
    const start = timeToMinutes(activity.time);
    return start !== null && activity.durationMinutes !== undefined && start + activity.durationMinutes > currentStart;
  });
}

function TimelineMessage({ status, onRetry }: { status: TimelineLoadState; onRetry: () => void }) {
  if (status === "loading") return <p className="mb-4 text-center text-[13px] leading-[21px] text-deep-sea/55" role="status">Napi terv betöltése…</p>;
  if (status === "offline") return <p className="mb-4 text-center text-[13px] leading-[21px] text-deep-sea/55" role="status">Offline · az utolsó ismert napi terv látható.</p>;
  if (status === "error") return <div className="mb-4 flex items-center justify-between gap-3 rounded-s border border-coral/20 bg-coral/5 px-3 py-2 text-[13px] leading-[18px] text-deep-sea/60" role="alert"><span>A napi terv most nem érhető el.</span><button type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-s px-2 font-semibold text-deep-sea">Újrapróbálás</button></div>;
  return null;
}

function TimelineSkeleton() {
  return <ol className="relative m-0 list-none space-y-7 p-0 before:absolute before:bottom-6 before:left-[55px] before:top-4 before:w-px before:bg-deep-sea/10" aria-hidden="true">{[0, 1, 2].map((item) => <li key={item} className="grid grid-cols-[44px_1fr] gap-x-6"><span className="mt-1 h-4 w-9 rounded bg-deep-sea/10" /><span className="space-y-2"><span className="block h-5 w-32 rounded bg-deep-sea/10" /><span className="block h-4 w-44 rounded bg-deep-sea/10" /></span></li>)}</ol>;
}

export function PlanList({ activities, status, onRetry }: { activities: HomeActivity[]; status: TimelineLoadState; onRetry: () => void }) {
  const showSkeleton = status === "loading" && activities.length === 0;
  const showEmpty = status === "empty" && activities.length === 0;

  return <section aria-label="Napi idővonal" aria-busy={status === "loading"}>
    <TimelineMessage status={status} onRetry={onRetry} />
    {showSkeleton ? <TimelineSkeleton /> : showEmpty ? <p className="py-10 text-center text-sm leading-[21px] text-deep-sea/60">Erre a napra még nincs program.</p> : <ol className="relative m-0 list-none p-0 before:absolute before:bottom-6 before:left-[55px] before:top-4 before:w-px before:bg-deep-sea/10">
      {activities.map((activity, index) => {
        const travel = activity.kind === "travel";
        const conflict = hasConflict(activities, index);

        return <li key={`${activity.time}-${activity.title}-${index}`} className="relative mb-7 grid grid-cols-[44px_1fr] gap-x-6">
          <time className={`pt-0.5 text-[13px] leading-[21px] ${travel || activity.isSystemGenerated ? "text-deep-sea/35" : "text-deep-sea/55"}`}>{activity.time}</time>
          <span aria-hidden="true" className={`absolute left-[51px] top-2 h-[9px] w-[9px] rounded-full border-2 border-quartz ${activity.localEvent ? "bg-coral shadow-[0_0_0_4px_rgba(241,140,121,.14)]" : travel ? "bg-deep-sea/30" : "bg-turquoise shadow-[0_0_0_1px_rgba(20,127,145,.25)]"}`} />
          <article className={`min-w-0 ${activity.localEvent ? "-mt-2 rounded-[16px] bg-coral/10 p-3" : travel || activity.isSystemGenerated ? "opacity-65" : ""}`}>
            {activity.localEvent && <span className="mb-2 inline-flex rounded-full bg-coral/15 px-2 py-1 text-[11px] font-bold text-coral">Helyi esemény</span>}
            <h2 className={`text-[17px] font-bold leading-[23px] ${activity.localEvent ? "text-coral" : "text-deep-sea"}`}>{activity.title}</h2>
            {activity.place && <p className="mt-1 text-sm leading-5 text-deep-sea/60">{activity.place}</p>}
            {activity.description && <p className="mt-1 text-sm leading-[21px] text-deep-sea/60">{activity.description}</p>}
            {activity.recommendation && <p className="mt-2 text-[13px] leading-[18px] text-turquoise-dark">Ajánlott · {activity.recommendation}</p>}
            {activity.localEvent && activity.eventNote && <p className="mt-1 text-xs leading-[18px] text-deep-sea/60">{activity.eventNote}</p>}
            {conflict && <p className="mt-2 text-[13px] leading-[18px] text-coral" role="status">Időütközés · Ez a program átfed egy korábbival.</p>}
          </article>
        </li>;
      })}
    </ol>}
  </section>;
}
