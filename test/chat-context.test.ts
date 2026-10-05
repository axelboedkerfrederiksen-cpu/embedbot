import test from "node:test";
import assert from "node:assert/strict";
import { selectWebsiteContext, WEBSITE_CONTEXT_LIMIT } from "../lib/chat-context.ts";

test("small imports are preserved exactly and absent imports remain empty", () => {
  const source = "Åbningstider: mandag til fredag 9–17.\nRetur inden 30 dage.";
  assert.equal(selectWebsiteContext(source, "Hvornår har I åbent?"), source);
  assert.equal(selectWebsiteContext("", "hello"), "");
});

function largeImport() {
  return Array.from({ length: 25 }, (_, index) => {
    const policy = index === 24 ? "Returpolitik: Du har 30 dages returret. Brug vores returformular." : `Kategori ${index}: ${"Uldgarn og tilbehør til strik. ".repeat(65)}`;
    return `SIDE ${JSON.stringify({ url: `https://shop.example/page-${index}`, title: index === 24 ? "Returpolitik" : `Kategori ${index}` })}\n${policy}`;
  }).join("\n\n");
}

test("large imports keep a relevant policy near the end and its page URL within the budget", () => {
  const source = largeImport();
  const selected = selectWebsiteContext(source, "Hvad er jeres returpolitik?");
  assert.ok(source.length > WEBSITE_CONTEXT_LIMIT * 2);
  assert.ok(selected.length <= WEBSITE_CONTEXT_LIMIT);
  assert.match(selected, /30 dages returret/);
  assert.match(selected, /https:\/\/shop.example\/page-24/);
});

test("brief follow-ups retain the preceding product topic and intact crawler records", () => {
  const product = `PRODUKT ${JSON.stringify({ name: "Alpaca Cloud", url: "https://shop.example/alpaca-cloud", price: "99", currency: "DKK" })}`;
  const source = largeImport() + `\n\nSIDE {"url":"https://shop.example/alpaca-cloud","title":"Alpaca Cloud"}\n${product}\nFarver: blå, grøn, rød.`;
  const selected = selectWebsiteContext(source, "Og i blå?", [{ role: "user", content: "Fortæl om Alpaca Cloud" }], 4000);
  assert.match(selected, /Alpaca Cloud/);
  assert.ok(selected.includes(product));
  assert.ok(selected.length <= 4000);
});

test("a single long HTML paragraph retains a matching passage well past the prefix", () => {
  const source = "Velkommen til vores hjemmeside. ".repeat(600) + " Garanti: Specialproduktet har fem års garanti. " + "Se også vores udvalg. ".repeat(600);
  const selected = selectWebsiteContext(source, "Garanti på specialproduktet?", [], 4000);
  assert.match(selected, /fem års garanti/);
  assert.ok(selected.length <= 4000);
});

test("selections never reuse context between businesses", () => {
  assert.match(selectWebsiteContext(largeImport(), "returpolitik"), /30 dages returret/);
  assert.equal(selectWebsiteContext("Anden virksomhed: 14 dages returret.", "returpolitik"), "Anden virksomhed: 14 dages returret.");
});

test("unmatched queries preserve knowledge rather than dropping an arbitrary part of the site", () => {
  const source = largeImport();
  assert.equal(selectWebsiteContext(source, "Explain your refund conditions"), source);
});
