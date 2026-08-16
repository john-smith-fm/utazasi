/**
 * Decides whether a legacy browser snapshot may safely continue its one-time
 * import. Runtime Notebook data created by another device must never be
 * silently merged into that snapshot.
 */
export function hasForeignNotebookRuntimeData(migrationKey: string, sourceIds: Array<string | null | undefined>) {
  const sourcePrefix = `${migrationKey}:`;
  return sourceIds.some((sourceId) => !sourceId?.startsWith(sourcePrefix));
}
