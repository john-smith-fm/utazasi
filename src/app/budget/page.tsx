import { NotebookShell } from "@/components/NotebookShell";

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+16px)]">
      <NotebookShell />
    </div>
  );
}
