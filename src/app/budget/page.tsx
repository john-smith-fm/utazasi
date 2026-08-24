import { NotebookShell } from "@/components/NotebookShell";

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-10 pt-[calc(env(safe-area-inset-top)+16px)]">
      <NotebookShell />
    </div>
  );
}
