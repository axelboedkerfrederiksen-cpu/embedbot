import { test } from "node:test";
import assert from "node:assert/strict";
import { directStockQuery, heuristicLanguage } from "../lib/commerce/chat.ts";

test("stock questions preserve product names and explicit variant values", () => {
  assert.equal(directStockQuery("Er The Complete Snowboard på lager i farven Ice?")?.variant, "Ice");
  assert.equal(directStockQuery("Har I den sorte trøje på lager i størrelse M?")?.query, "den sorte trøje");
  assert.equal(directStockQuery("Is The Out of Stock Snowboard in stock?")?.query, "The Out of Stock Snowboard");
  assert.equal(heuristicLanguage("Is The Out of Stock Snowboard in stock?"), "en");
  assert.equal(directStockQuery("Er The Inventory Not Tracked Snowboard på lager?")?.query, "The Inventory Not Tracked Snowboard");
});

test("ambiguous requests and private identifiers stay out of direct stock queries", () => {
  for (const message of ["Er den på lager?", "Er den udsolgt?", "Har I den på lager i farven Ice?", "Is it in stock?", "Is that one available?", "Har I den på lager i morgen?", "Hvad kan chatbotten fortælle om lagerstatus?", "Er kunde@example.com på lager?", "Er trøjen på lager i farven kunde@example.com?", "Er trøjen på lager i størrelse #123?", "Hvor er min ordre?", "Og i størrelse M?"]) assert.equal(directStockQuery(message), null);
});
