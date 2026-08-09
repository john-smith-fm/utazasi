"use client";

import { useState, type FormEvent } from "react";
import type { Expense } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLiveClock } from "@/hooks/useLiveClock";

export function ExpenseTracker() {
  const now = useLiveClock();
  const { value: expenses, setValue: setExpenses } = useLocalStorage<Expense[]>("expenses", []);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const todayTotal = expenses.filter((e) => e.date === now.dateStr).reduce((s, e) => s + e.amount, 0);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed)) return;
    setExpenses((prev) => [...prev, { name: name.trim(), amount: parsed, date: now.dateStr }]);
    setName("");
    setAmount("");
  }

  function handleDelete(idx: number) {
    setExpenses((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      <div className="mb-4 rounded-m bg-white p-5 shadow-card">
        <div className="flex justify-between py-2 text-[15px]">
          <span>Mai kiadás</span>
          <span>{todayTotal.toFixed(0)} €</span>
        </div>
        <div
          className="mt-1 flex justify-between border-t pt-3 font-semibold"
          style={{ borderColor: "rgba(24,50,59,0.10)" }}
        >
          <span>Teljes kiadás</span>
          <span>{total.toFixed(0)} €</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-3.5 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mire?"
          autoComplete="off"
          required
          className="flex-1 rounded-ui-s border px-3.5 py-3 text-[15px] text-deep-sea"
          style={{ borderColor: "rgba(24,50,59,0.10)" }}
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="€"
          inputMode="decimal"
          step="0.01"
          required
          className="w-[84px] rounded-ui-s border px-2.5 py-3 text-[15px] text-deep-sea"
          style={{ borderColor: "rgba(24,50,59,0.10)" }}
        />
        <button
          type="submit"
          aria-label="Kiadás hozzáadása"
          className="w-[46px] rounded-ui-s bg-turquoise text-[22px] font-semibold text-white"
        >
          +
        </button>
      </form>

      <div className="flex flex-col">
        {expenses.length === 0 && (
          <p className="px-1 py-2 text-sm text-neutral-700">Még nincs rögzített kiadás.</p>
        )}
        {expenses
          .map((e, i) => ({ ...e, idx: i }))
          .reverse()
          .map((e) => (
            <div
              key={e.idx}
              className="flex items-center justify-between border-b py-2.5 text-[14.5px]"
              style={{ borderColor: "rgba(24,50,59,0.10)" }}
            >
              <span className="mr-2.5 text-[11px] text-neutral-700">{e.date.slice(5)}</span>
              <span className="flex-1">{e.name}</span>
              <span className="mr-2.5 font-semibold">{e.amount.toFixed(2)} €</span>
              <button onClick={() => handleDelete(e.idx)} aria-label="Törlés" className="text-neutral-700">
                ✕
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
