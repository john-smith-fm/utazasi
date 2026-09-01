import "server-only";
import { Buffer } from "node:buffer";
import { editorialFingerprint, parseEditorialCopy, type EditorialCopy, type EditorialCopyInput } from "./editorial-copy-contract";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 12_000;
const MAX_CONTEXT_BYTES = 8_000;
const MAX_OUTPUT_TOKENS = 240;

export const EDITORIAL_COPYWRITER_SYSTEM_PROMPT = `A dayFacts mező a napi Timeline ellenőrzött, rövid összefoglalója. Ezen tények alapján írj egy címet és egy alcímet magyarul egy családi nyaraláshoz.

Úgy írj, mintha egy család programjához írnál kedves, könnyed szöveget. Ne magazin-editorialt, ne útikönyvet és ne elemzést írj.

CÍM
- 2–6 szó, egy sor, írásjel nélkül a végén.
- A cím ne egyszerűen nevezze meg a helyet vagy a programot: olyan legyen, amit egy családtag is odaírhatna a nyaralási terv fölé.
- Egyszerű, természetes és ötletes; lehet játékos vagy lelkes.
- Nem kell összefoglalnia a teljes napot.
- Ne használd önmagában vagy sablonosan az „Irány + hely”, „hely vár”, „hely nap” fordulatot.
- „Vissza”, „újra” vagy „még egyszer” csak akkor szerepelhet a címben, ha a dayFacts mezőben kifejezetten ott van a „Visszatérés:” tény.

ALCÍM
- Egy rövid, természetes magyar mondat.
- Egyszerűen mondd el, mi vár ránk.
- Következetesen többes szám első személyben írj: megyünk, strandolunk, visszatérünk, ebédelünk, indulunk. Ne válts „rátok” vagy „ti” formára.
- Ne sorold fel az összes programot.
- Ne használj olyan elvont fordulatokat, mint „a nap ritmusa”, „köré szerveződik” vagy „a család igényeihez igazodva”.

A kívánt hang példái (ezeket ne másold):
- „Strandra fel!” / „Strandolással kezdődik a nyaralás első egész napja.”
- „Vár a tenger” / „Az első teljes napunk rögtön Porto Sa Ruxinál kezdődik.”
- „Játszótérre fel!” / „Ma a játszótéré a főszerep, aztán jöhet egy közös ebéd.”
- „Vissza Cala Pirára” / „Úgy látszik, nem volt elég egyszer — ma megint itt strandolunk.”
- „Még egy utolsó csobbanás” / „Poettónál még belefér a tenger, mielőtt elindulunk a repülőtérre.”

Elsősorban a dayFacts mezőt használd: ez mondja el, mi történik aznap. Csak a supplied briefben szereplő konkrét tényt állíthatod. Ne találj ki nyitvatartást, útvonalat, időtartamot, árat, időjárást, strandjellemzőt, programot vagy élményt. Konkrét helyet vagy eseményt csak a dayFacts, mainActivity, verifiedEvent vagy placeFacts adatból említs. Ha kevés a tény, legyen a szöveg rövidebb és egyszerűbb, ne egészítsd ki képzelettel.
Egy ellenőrzés: a briefben nem szereplő konkrét főnevet vagy jelzőt ne tegyél a szövegbe. A játékosság a hangból jöjjön, ne kitalált részletekből.

Ne használj emojit, bulletet vagy címsort. A recentEditorialCopy csak arra való, hogy lehetőleg ne ismételd ugyanazt a megfogalmazást.

Technikai válasz: kizárólag a megadott JSON-sémát add vissza. A grounding tömbbe az allowedGrounding listából másold be a felhasznált tények pontos szövegét; ez belső ellenőrzés, nem jelenik meg a felületen.`;

function responseText(body: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("A napi szerkesztői szöveg nem érkezett meg.");
}

function allowedGrounding(input: EditorialCopyInput) {
  return [
    ...input.dayFacts,
    ...input.signals.map((signal) => `signal:${signal}`),
    ...(input.mainActivity?.placeName ? [input.mainActivity.placeName] : []),
    ...(input.verifiedEvent ? [input.verifiedEvent.title, ...(input.verifiedEvent.time ? [input.verifiedEvent.time] : [])] : []),
    ...input.placeFacts.flatMap((place) => [place.name, ...place.facts]),
  ];
}

export async function createEditorialCopy(input: EditorialCopyInput): Promise<{ copy: EditorialCopy; fingerprint: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("A napi szerkesztői szöveg nincs konfigurálva.");
  // The model only needs the small set of public day facts and recent titles.
  // Keep implementation-only classification signals out of its creative brief.
  const userInput = JSON.stringify({
    brief: {
      dayFacts: input.dayFacts,
      recentTitles: input.recentEditorialCopy.map((copy) => copy.title),
    },
    allowedGrounding: allowedGrounding(input),
  });
  if (Buffer.byteLength(userInput, "utf8") > MAX_CONTEXT_BYTES) throw new Error("A napi szerkesztői kontextus túl nagy.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_EDITORIAL_MODEL ?? process.env.OPENAI_QUESTION_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-terra",
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: "low" },
        text: { verbosity: "low", format: { type: "json_schema", name: "daily_editorial_copy", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["title", "subtitle", "grounding"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 62 },
            subtitle: { type: "string", minLength: 10, maxLength: 280 },
            grounding: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } },
          },
        } } },
        input: [
          { role: "system", content: EDITORIAL_COPYWRITER_SYSTEM_PROMPT },
          { role: "user", content: userInput },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`A napi szerkesztői szöveg most nem elérhető (${response.status}).`);
    return { copy: parseEditorialCopy(responseText(body), input), fingerprint: editorialFingerprint(input) };
  } finally {
    clearTimeout(timer);
  }
}
