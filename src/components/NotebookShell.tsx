"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FORM_CONTROL } from "@/components/formStyles";
import { migrateLegacyNotebookOnce } from "@/lib/notebook-legacy-migration";
import type { NotebookEntryKind, NotebookEntryRecord, PackingItemRecord } from "@/lib/notebook-types";
import { storageGet, storageSet } from "@/lib/storage";

type NotebookData = { packing: PackingItemRecord[]; entries: NotebookEntryRecord[] };
type Tab = "money" | "packing" | "notes" | "journal";
// v1 could contain pre-persistence rows without the fields used by the API.
// Start v2 with a server-shaped cache; the browser's original legacy data is
// still preserved separately and imported safely only once.
const CACHE_KEY = "utazasi-notebook-v2";
const TAB_KEY = "utazasi-notebook-tab-v1";
const TABS: Array<{ id: Tab; label: string }> = [{ id: "money", label: "Pénz" }, { id: "packing", label: "Pakolás" }, { id: "notes", label: "Jegyzetek" }, { id: "journal", label: "Napló" }];

function romeDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateLabel(value: string) { return new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00Z`)); }

function EntryForm({ kind, onCreate }: { kind: NotebookEntryKind; onCreate: (data: Record<string, unknown>) => Promise<void> }) {
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");
  const [rating, setRating] = useState("5");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onCreate({ kind, content: content.trim(), amountEur: kind === "expense" ? amount : null, occurredOn: romeDate(), rating: kind === "journal" ? Number(rating) : null });
      setContent(""); setAmount("");
    } finally { setSaving(false); }
  }
  const placeholder = kind === "expense" ? "Mire költöttetek?" : kind === "journal" ? "Mi történt ma?" : "Új jegyzet…";
  return <form onSubmit={submit} className="mt-4 space-y-2.5">
    <input value={content} onChange={(event) => setContent(event.target.value)} placeholder={placeholder} className={`${FORM_CONTROL} w-full px-3.5`} maxLength={2000} required />
    {kind === "expense" ? <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Összeg €" type="number" inputMode="decimal" min="0" step="0.01" className={`${FORM_CONTROL} w-32 px-3.5`} required /> : null}
    {kind === "journal" ? <label className="flex min-h-12 items-center gap-3 text-sm text-deep-sea/70">Nap értékelése <select value={rating} onChange={(event) => setRating(event.target.value)} className={`${FORM_CONTROL} h-11 w-20 px-2`}><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select></label> : null}
    <button disabled={saving} className="min-h-12 rounded-ui-s border border-turquoise bg-turquoise/15 px-4 text-sm font-semibold text-deep-sea disabled:opacity-50">{saving ? "Mentés…" : "Mentés"}</button>
  </form>;
}

function EntryEditForm({ entry, onSave, onCancel }: { entry: NotebookEntryRecord; onSave: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [content, setContent] = useState(entry.content);
  const [amount, setAmount] = useState(entry.amountEur === null ? "" : String(entry.amountEur));
  const [occurredOn, setOccurredOn] = useState(entry.occurredOn);
  const [rating, setRating] = useState(String(entry.rating ?? 5));
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave({
        kind: entry.kind,
        content: content.trim(),
        amountEur: entry.kind === "expense" ? amount : null,
        occurredOn,
        rating: entry.kind === "journal" ? Number(rating) : null,
      });
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-2.5 rounded-ui-s bg-turquoise/5 p-3">
    <input value={content} onChange={(event) => setContent(event.target.value)} aria-label="Bejegyzés tartalma" maxLength={2000} required className={`${FORM_CONTROL} w-full px-3.5`} />
    <div className="flex flex-wrap gap-2">
      <input value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} aria-label="Bejegyzés dátuma" type="date" required className={`${FORM_CONTROL} w-[154px] px-3`} />
      {entry.kind === "expense" ? <input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Összeg euróban" type="number" inputMode="decimal" min="0" step="0.01" required className={`${FORM_CONTROL} w-28 px-3`} /> : null}
      {entry.kind === "journal" ? <select value={rating} onChange={(event) => setRating(event.target.value)} aria-label="Nap értékelése" className={`${FORM_CONTROL} h-12 w-24 px-2`}><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select> : null}
    </div>
    <div className="flex gap-2"><button disabled={saving} className="min-h-11 rounded-ui-s border border-turquoise bg-turquoise/15 px-3.5 text-sm font-semibold text-deep-sea disabled:opacity-50">{saving ? "Mentés…" : "Mentés"}</button><button type="button" onClick={onCancel} disabled={saving} className="min-h-11 px-2 text-sm font-semibold text-deep-sea/60">Mégse</button></div>
  </form>;
}

function EntryList({ entries, kind, onDelete, onUpdate }: { entries: NotebookEntryRecord[]; kind: NotebookEntryKind; onDelete: (id: string) => Promise<void>; onUpdate: (id: string, data: Record<string, unknown>) => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const visible = entries.filter((entry) => entry.kind === kind);
  if (!visible.length) return <p className="mt-5 text-sm leading-6 text-deep-sea/60">Még nincs bejegyzés.</p>;
  return <div className="mt-5 divide-y divide-deep-sea/10">{visible.map((entry) => <article key={entry.id} className="py-3.5">{editingId === entry.id ? <EntryEditForm entry={entry} onCancel={() => setEditingId(null)} onSave={async (value) => { await onUpdate(entry.id, value); setEditingId(null); }} /> : <div className="flex gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-[.04em] text-deep-sea/45">{dateLabel(entry.occurredOn)}</p><p className="mt-1 text-sm leading-6 text-deep-sea">{entry.content}</p>{kind === "journal" && entry.rating ? <p className="mt-1 text-xs text-turquoise-dark">{"★".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</p> : null}</div>{kind === "expense" && entry.amountEur !== null ? <strong className="whitespace-nowrap text-sm text-deep-sea">{entry.amountEur.toFixed(2)} €</strong> : null}<div className="flex shrink-0 flex-col items-end"><button onClick={() => setEditingId(entry.id)} aria-label="Bejegyzés szerkesztése" className="min-h-11 px-2 text-sm text-deep-sea/60">Szerkesztés</button><button onClick={() => void onDelete(entry.id)} aria-label="Bejegyzés törlése" className="min-h-11 px-2 text-sm text-deep-sea/45">Törlés</button></div></div>}</article>)}</div>;
}

/** The runtime Notebook reads/writes only through the PIN-protected server API. */
export function NotebookShell() {
  const [tab, setTab] = useState<Tab>(() => storageGet<Tab>(TAB_KEY, "money"));
  const [data, setData] = useState<NotebookData>(() => storageGet<NotebookData>(CACHE_KEY, { packing: [], entries: [] }));
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [packingTitle, setPackingTitle] = useState("");

  function setNotebook(next: NotebookData) { storageSet(CACHE_KEY, next); setData(next); }
  async function load() {
    try {
      await migrateLegacyNotebookOnce();
      const response = await fetch("/api/notebook", { cache: "no-store" });
      if (!response.ok) throw new Error("A Jegyzetfüzet most nem érhető el.");
      const next = await response.json() as NotebookData;
      setNotebook(next); setStatus("ready"); setMessage(null);
    } catch (error) {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setMessage(error instanceof Error ? error.message : "A Jegyzetfüzet most nem érhető el.");
    }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { storageSet(TAB_KEY, tab); }, [tab]);

  async function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    if (!navigator.onLine) throw new Error("Offline módban a módosítás nem menthető.");
    const response = await fetch("/api/notebook", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "A mentés nem sikerült.");
    return payload;
  }
  async function createEntry(value: Record<string, unknown>) {
    try { const entry = await request("POST", { resource: "entry", data: value }) as unknown as NotebookEntryRecord; setNotebook({ ...data, entries: [entry, ...data.entries] }); setMessage(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : "A mentés nem sikerült."); throw error; }
  }
  async function updateEntry(id: string, value: Record<string, unknown>) {
    try {
      const entry = await request("PATCH", { resource: "entry", id, data: value }) as unknown as NotebookEntryRecord;
      setNotebook({ ...data, entries: data.entries.map((current) => current.id === id ? entry : current) });
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A mentés nem sikerült.");
      throw error;
    }
  }
  async function deleteEntry(id: string) { try { await request("DELETE", { resource: "entry", id }); setNotebook({ ...data, entries: data.entries.filter((entry) => entry.id !== id) }); setMessage(null); } catch (error) { setMessage(error instanceof Error ? error.message : "A törlés nem sikerült."); } }
  async function addPacking(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!packingTitle.trim()) return; try { const item = await request("POST", { resource: "packing", data: { title: packingTitle.trim(), isPacked: false, position: data.packing.length } }) as unknown as PackingItemRecord; setNotebook({ ...data, packing: [...data.packing, item] }); setPackingTitle(""); setMessage(null); } catch (error) { setMessage(error instanceof Error ? error.message : "A mentés nem sikerült."); } }
  async function togglePacking(item: PackingItemRecord) { try { const updated = await request("PATCH", { resource: "packing", id: item.id, data: { title: item.title, isPacked: !item.isPacked, position: item.position } }) as unknown as PackingItemRecord; setNotebook({ ...data, packing: data.packing.map((entry) => entry.id === item.id ? updated : entry) }); setMessage(null); } catch (error) { setMessage(error instanceof Error ? error.message : "A mentés nem sikerült."); } }
  async function deletePacking(id: string) { try { await request("DELETE", { resource: "packing", id }); setNotebook({ ...data, packing: data.packing.filter((item) => item.id !== id) }); setMessage(null); } catch (error) { setMessage(error instanceof Error ? error.message : "A törlés nem sikerült."); } }

  const expenses = data.entries.filter((entry) => entry.kind === "expense");
  const total = useMemo(() => expenses.reduce((sum, entry) => sum + (entry.amountEur ?? 0), 0), [expenses]);
  const packed = data.packing.filter((item) => item.isPacked).length;
  return <section className="mt-6" aria-label="Jegyzetfüzet tartalma">
    <div role="tablist" aria-label="Jegyzetfüzet kategóriák" className="flex gap-1 overflow-x-auto border-b border-deep-sea/10 pb-1">{TABS.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 shrink-0 rounded-ui-s px-3 text-sm font-semibold ${tab === item.id ? "bg-turquoise/15 text-deep-sea" : "text-deep-sea/55"}`}>{item.label}</button>)}</div>
    {message ? <div className="mt-4 flex items-center justify-between gap-3 rounded-ui-s border border-coral/25 bg-coral/5 px-3.5 py-3 text-sm text-deep-sea/75"><span>{message}</span><button onClick={() => { setMessage(null); void load(); }} className="min-h-11 shrink-0 font-semibold text-deep-sea">Újrapróbálás</button></div> : null}
    {status === "offline" ? <p className="mt-4 text-sm text-deep-sea/60">Offline módban az utoljára betöltött Jegyzetfüzet látható. Módosítás most nem menthető.</p> : null}
    {status === "loading" ? <p className="mt-5 text-sm text-deep-sea/60">Jegyzetfüzet betöltése…</p> : null}
    {tab === "money" ? <section className="pt-5"><div className="rounded-ui-s bg-white/60 p-4"><p className="text-xs font-semibold uppercase tracking-[.04em] text-deep-sea/45">Teljes kiadás</p><p className="mt-1 text-2xl font-semibold text-deep-sea">{total.toFixed(2)} €</p></div><EntryForm kind="expense" onCreate={createEntry} /><EntryList entries={data.entries} kind="expense" onDelete={deleteEntry} onUpdate={updateEntry} /></section> : null}
    {tab === "packing" ? <section className="pt-5"><p className="text-sm text-deep-sea/65">{data.packing.length ? `${packed} / ${data.packing.length} becsomagolva` : "Add hozzá az első tételt."}</p><form onSubmit={addPacking} className="mt-4 flex gap-2"><input value={packingTitle} onChange={(event) => setPackingTitle(event.target.value)} placeholder="Új pakolási tétel" className={`${FORM_CONTROL} min-w-0 flex-1 px-3.5`} /><button className="min-h-12 rounded-ui-s border border-turquoise bg-turquoise/15 px-4 text-sm font-semibold text-deep-sea">Hozzáadás</button></form><div className="mt-4 divide-y divide-deep-sea/10">{data.packing.map((item) => <div key={item.id} className="flex items-center gap-2 py-3"><button onClick={() => void togglePacking(item)} aria-label={`${item.title} ${item.isPacked ? "nincs becsomagolva" : "becsomagolva"}`} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${item.isPacked ? "border-turquoise bg-turquoise text-white" : "border-deep-sea/20 text-transparent"}`}>✓</button><p className={`min-w-0 flex-1 text-sm ${item.isPacked ? "text-deep-sea/45 line-through" : "text-deep-sea"}`}>{item.title}</p><button onClick={() => void deletePacking(item.id)} aria-label="Pakolási tétel törlése" className="min-h-11 px-2 text-sm text-deep-sea/45">Törlés</button></div>)}</div></section> : null}
    {tab === "notes" ? <section className="pt-5"><EntryForm kind="note" onCreate={createEntry} /><EntryList entries={data.entries} kind="note" onDelete={deleteEntry} onUpdate={updateEntry} /></section> : null}
    {tab === "journal" ? <section className="pt-5"><EntryForm kind="journal" onCreate={createEntry} /><EntryList entries={data.entries} kind="journal" onDelete={deleteEntry} onUpdate={updateEntry} /></section> : null}
  </section>;
}
