"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const UNDO_DURATION_MS = 6_000;

type UndoRequest = {
  message: string;
  onUndo: () => Promise<void> | void;
  onError?: (error: unknown) => void;
};

type UndoContextValue = { scheduleUndo: (request: UndoRequest) => void };

const UndoContext = createContext<UndoContextValue | null>(null);

/**
 * One application-level undo surface for destructive swipe actions. Keeping it
 * above individual pages means it survives tab changes and ordinary navigation.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<UndoRequest | null>(null);
  const [restoring, setRestoring] = useState(false);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setRequest(null);
    setRestoring(false);
  }, []);

  const scheduleUndo = useCallback((next: UndoRequest) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setRestoring(false);
    setRequest(next);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setRequest(null);
    }, UNDO_DURATION_MS);
  }, []);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  async function restore() {
    if (!request || restoring) return;
    const current = request;
    dismiss();
    setRestoring(true);
    try {
      await current.onUndo();
    } catch (error) {
      current.onError?.(error);
    } finally {
      setRestoring(false);
    }
  }

  return <UndoContext.Provider value={{ scheduleUndo }}>
    {children}
    {request ? <div role="status" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-4 right-[86px] z-[70] flex min-h-12 items-center justify-between gap-3 rounded-full bg-deep-sea px-4 py-2 text-sm font-medium text-white shadow-[0_6px_20px_rgba(24,50,59,.18)]">
      <span>{request.message}</span>
      <button type="button" disabled={restoring} onClick={() => void restore()} className="min-h-10 shrink-0 rounded-full bg-white/15 px-3 text-sm font-semibold text-white disabled:opacity-50">Visszaállítás</button>
    </div> : null}
  </UndoContext.Provider>;
}

export function useUndoToast() {
  const context = useContext(UndoContext);
  if (!context) throw new Error("useUndoToast must be used inside UndoProvider.");
  return context;
}
