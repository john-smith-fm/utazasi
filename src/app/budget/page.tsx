import { NotebookShell } from "@/components/NotebookShell";
import { TripFeatureGate } from "@/components/TripFeatureGate";

export default function BudgetPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+16px)]">
      <TripFeatureGate featureName="Jegyzetfüzet"><NotebookShell /></TripFeatureGate>
    </div>
  );
}
