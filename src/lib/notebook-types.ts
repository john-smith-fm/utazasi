export type NotebookEntryKind = "expense" | "note" | "journal";

export type PackingItemRecord = {
  id: string;
  title: string;
  isPacked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type NotebookEntryRecord = {
  id: string;
  kind: NotebookEntryKind;
  content: string;
  amountEur: number | null;
  occurredOn: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LegacyExpense = { name: string; amount: number; date: string };
export type LegacyPackingItem = { name: string; checked: boolean };
export type LegacyJournalEntry = { date: string; note: string; rating: number };

export type LegacyNotebookSnapshot = {
  expenses: LegacyExpense[];
  packing: LegacyPackingItem[];
  journal: LegacyJournalEntry[];
};
