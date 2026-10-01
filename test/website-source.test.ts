import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { extractWebsiteText, websiteUrl, MAX_SOURCE_TEXT } from "../lib/website-source.ts";
import { readOnboardingSnapshot } from "../lib/onboarding.ts";

test("HTML import extracts knowledge without scripts, hidden content, forms or page execution", () => {
  const result = extractWebsiteText('<html><head><title>Title</title><script>stealSecrets()</script></head><body><h1>Vores butik</h1><p>Vi sælger håndlavede borde og stole.</p><div hidden>private hidden data</div><form>Kortnummer: secret</form><iframe>embedded secret</iframe><script>fetch("https://evil.example")</script></body></html>');
  assert.equal(result.text, "Vores butik Vi sælger håndlavede borde og stole.");
  assert.equal(result.truncated, false);
  assert.throws(() => extractWebsiteText("Just a text file, not HTML"));
  assert.throws(() => extractWebsiteText("<html><script>onlyCode()</script></html>"));
  assert.throws(() => extractWebsiteText(`<p>${"a".repeat(1_000_001)}</p>`));
});
test("imported content is bounded and truncation is explicit", () => {
  const result = extractWebsiteText(`<p>${"Ordentlig viden om butikken. ".repeat(2000)}</p>`);
  assert.equal(result.text.length, MAX_SOURCE_TEXT);
  assert.equal(result.truncated, true);
});
test("website URLs disallow credentials, clear-text and alternate ports", () => {
  for (const url of ["file:///tmp/shop.html", "http://shop.example", "https://user:secret@shop.example", "https://shop.example:8443"]) assert.throws(() => websiteUrl(url));
  assert.equal(websiteUrl("https://shop.example/page#section").href, "https://shop.example/page");
});
test("onboarding keeps the same bot and step after an authorization return", () => {
  const business_id = randomUUID();
  const form = {name:"Min butik",platform:"HTML",website_url:""};
  assert.deepEqual(readOnboardingSnapshot(JSON.stringify({business_id,form,step:7})), {business_id,form,step:7});
  assert.equal(readOnboardingSnapshot(JSON.stringify({business_id,form}))!.step,7);
  assert.equal(readOnboardingSnapshot(JSON.stringify({business_id:"invalid",form,step:7})),null);
  assert.equal(readOnboardingSnapshot(JSON.stringify({business_id,form:{name:[]},step:7})),null);
  assert.equal(readOnboardingSnapshot("invalid JSON"),null);
});
