# Notebook Foundation v1

This foundation moves future family-created notebook data from the old
browser-only prototype into PIN-protected Supabase runtime data.

## Tables

- `packing_items`: ordered, checkable packing-list items.
- `notebook_entries`: `expense`, `note` and `journal` entries.
- `notebook_legacy_imports`: one completed legacy import per stable browser
  migration key.

All three tables have RLS enabled. Browser clients have no direct grants;
the app uses only its PIN-protected server routes under `/api/notebook`.

## Legacy import

The future Notebook Shell calls `migrateLegacyNotebookOnce()` before switching
from the old local browser data to server data. It sends a single snapshot of
`expenses`, `packing` and `journal` to `/api/notebook/migrate`.

The request is idempotent:

1. the browser stores a stable migration key;
2. each imported record receives a deterministic legacy source ID;
3. the server records completion only after writes succeed;
4. a later app open does not re-import or synchronize the old snapshot.

Offline import fails visibly and remains retryable. No offline write queue is
created in 1.0.
