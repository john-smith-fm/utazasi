import { FxCard } from "@/components/FxCard";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { PackingList } from "@/components/PackingList";
import { Journal } from "@/components/Journal";

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-10">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 text-xs uppercase tracking-wider text-turquoise">
          Nyaralási keret
        </p>
        <h1 className="text-[32px] font-semibold text-deep-sea">Költségek</h1>
      </header>

      <div className="mt-5">
        <FxCard />
        <ExpenseTracker />

        <p className="mb-2.5 mt-8 text-xs uppercase tracking-wide text-neutral-700">
          Pakolási lista
        </p>
        <PackingList />

        <p className="mb-2.5 mt-8 text-xs uppercase tracking-wide text-neutral-700">
          Napló
        </p>
        <Journal />
      </div>
    </div>
  );
}
