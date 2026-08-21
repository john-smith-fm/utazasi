export type ShoppingIntent = "arrival_shopping" | "daily_groceries" | "quick_stop" | "local_products" | "baby_products" | "mobility";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU");
}

/**
 * Pure Hungarian intent recognition, deliberately separated from the data
 * lookup so everyday wording can be regression-tested without loading the
 * Shopping Intelligence dataset.
 */
export function detectShoppingIntent(question: string): ShoppingIntent | null {
  const value = normalized(question);
  // Hungarian endings matter here: "kaját" and "élelmet" are both ordinary
  // ways of asking where to buy food. A dinner-only question must stay out.
  const asksToBuyFood = /\b(kaja|elelm)[a-z]*\b/.test(value) && /\b(veg|vasar|bolt|hova|hol)\w*/.test(value);
  const hasShoppingWord = /bevasar|bolt|market|elelmiszer|uzlet/.test(value) || asksToBuyFood;

  if (/pelenk|baba|bebi|babatermek/.test(value)) return "baby_products";
  if (/kerulo|mennyi|milyen messze|legkozeleb|tavolsag|km|perc|utba esik|szallas.*bolt|bolt.*szallas/.test(value) && (/eurospin|crai|conad|mio|isa|market/.test(value) || hasShoppingWord)) return "mobility";
  if (/helyi.*termek|termek.*helyi|szardin|sardin/.test(value) && hasShoppingWord) return "local_products";
  if (/(erkez|nagybevasar|nagy bevasar)/.test(value) && hasShoppingWord) return "arrival_shopping";
  if (/(gyors|gyorsan|ugor)/.test(value) && hasShoppingWord) return "quick_stop";
  if (/(napi|mindennapi)/.test(value) && hasShoppingWord) return "daily_groceries";
  if (hasShoppingWord) return "daily_groceries";
  return null;
}
