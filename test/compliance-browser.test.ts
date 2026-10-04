import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSENT_KEY,CONSENT_VERSION,parseConsent,analyticsEndpoint,analyticsAllowed,installAnalyticsGuard,markWithdrawn } from "../lib/compliance/consent.ts";
// Exercise the actual runtime transport guard: loaded analytics cannot bypass
// withdrawal with a delayed engagement flush, cached fetch or sendBeacon.
test("consent rejects stale/malformed values and loaded analytics stop immediately, including delayed fetch/beacons and protected pages",async()=>{
 assert.equal(parseConsent("broken"),null);assert.equal(parseConsent(JSON.stringify({choice:"accepted",version:"old"})),null);
 let stored=JSON.stringify({choice:"accepted",version:CONSENT_VERSION});const calls:string[]=[];
 const fakeWindow={location:{origin:"https://embedbot.example",pathname:"/"},localStorage:{getItem:(key:string)=>key===CONSENT_KEY?stored:null},fetch:async(input:unknown)=>{calls.push(String(input));return new Response(null,{status:200});},navigator:{sendBeacon:(url:string)=>{calls.push(url);return true;}}};
 const prior=Object.getOwnPropertyDescriptor(globalThis,"window");Object.defineProperty(globalThis,"window",{value:fakeWindow,configurable:true});
 try{
  installAnalyticsGuard();assert.equal(analyticsAllowed(),true);
  const loadedFetch=fakeWindow.fetch;await loadedFetch("https://plausible.io/api/event");assert.equal(calls.length,1);
  fakeWindow.location.pathname="/dashboard";assert.equal(analyticsAllowed(),false);await loadedFetch("https://plausible.io/api/event");assert.equal(calls.length,1);
  fakeWindow.location.pathname="/";stored=JSON.stringify({choice:"rejected",version:CONSENT_VERSION});
  assert.equal(analyticsAllowed(),false);await loadedFetch("https://plausible.io/api/event");await loadedFetch("https://embedbot.example/_vercel/insights/event");await loadedFetch("/_vercel/speed-insights/vitals");assert.equal(calls.length,1);
  assert.equal(fakeWindow.navigator.sendBeacon("https://plausible.io/api/event"),false);assert.equal(calls.length,1);
  await loadedFetch("/api/dashboard/privacy");assert.equal(calls.length,2); // Ordinary application requests are unaffected.
  stored=JSON.stringify({choice:"accepted",version:CONSENT_VERSION});markWithdrawn();assert.equal(analyticsAllowed(),false);await loadedFetch("https://plausible.io/api/event");assert.equal(calls.length,2);
  assert.equal(analyticsEndpoint("https://example.com/_vercel/insights/event",fakeWindow.location.origin),false);
 }finally{if(prior)Object.defineProperty(globalThis,"window",prior);else Reflect.deleteProperty(globalThis,"window");}
});

test("auth and customer routes never allow analytics, even with saved consent", async () => {
 const { analyticsPage } = await import("../lib/compliance/consent.ts");
 for (const path of ["/auth/callback", "/auth/reset-password", "/auth/forgot-password", "/auth/account-created", "/dashboard/abc/samtaler", "/setup/provider", "/preview/abc", "/data-requests"]) {
  assert.equal(analyticsPage(path), false, path);
 }
 for (const path of ["/", "/prices", "/support", "/privacy", "/faq"]) assert.equal(analyticsPage(path), true, path);
});
