import assert from "node:assert/strict";
import test from "node:test";
import { extractProviderSources, researchMaxOutputTokens } from "./provider-openai.mjs";

test("extracts only HTTP(S) sources returned by web search", () => {
  const sources = extractProviderSources({ output: [
    { type: "web_search_call", action: { sources: [{ url: "https://example.com/menu", title: "Official menu" }, { url: "mailto:no@example.com" }] } },
    { type: "message", content: [{ annotations: [{ type: "url_citation", url: "https://town.example/events", title: "Town events" }] }] },
  ] });
  assert.deepEqual(sources, [
    { url: "https://example.com/menu", title: "Official menu" },
    { url: "https://town.example/events", title: "Town events" },
  ]);
});

test("research output has a bounded default and ignores unsafe overrides", () => {
  assert.equal(researchMaxOutputTokens(undefined), 2400);
  assert.equal(researchMaxOutputTokens("1600"), 1600);
  assert.equal(researchMaxOutputTokens("511"), 2400);
  assert.equal(researchMaxOutputTokens("4097"), 2400);
  assert.equal(researchMaxOutputTokens("not-a-number"), 2400);
});
