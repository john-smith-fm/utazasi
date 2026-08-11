import { NotebookShell } from "@/components/NotebookShell";

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-10">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 text-xs uppercase tracking-wider text-turquoise">
          Utazási
        </p>
        <h1 className="text-[32px] font-semibold text-deep-sea">Jegyzetfüzet</h1>
      </header>

      <NotebookShell />
    </div>
  );
}
