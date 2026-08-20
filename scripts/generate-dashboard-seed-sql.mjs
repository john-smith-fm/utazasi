/**
 * This command used to generate a Dashboard SQL script that could replace
 * Timeline rows. Runtime family data is now canonical after its first save,
 * so that workflow is intentionally unavailable.
 */
console.error([
  "Deprecated: Dashboard SQL seed generation is disabled to protect family data.",
  "Use `npm run seed:supabase` only to initialize a brand-new Trip.",
  "It never synchronizes or replaces an existing Trip.",
].join("\n"));

process.exitCode = 1;
