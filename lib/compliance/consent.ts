export const CONSENT_KEY="embedbot_cookie_consent";
export const CONSENT_VERSION="2026-10-02";
export type ConsentChoice="accepted"|"rejected"|null;
export function parseConsent(raw:string|null):ConsentChoice{
 try{const saved=JSON.parse(raw||"null");return saved?.version===CONSENT_VERSION&&["accepted","rejected"].includes(saved.choice)?saved.choice:null;}catch{return null;}
}
export function analyticsEndpoint(input:string,origin:string){
 try{const url=new URL(input,origin);return (url.origin==="https://plausible.io"&&url.pathname==="/api/event")||(url.origin===origin&&(/^\/_vercel\/(insights|speed-insights)\//.test(url.pathname)));}catch{return false;}
}
export function analyticsPage(path:string){return !/^\/(admin|auth|dashboard|setup|preview|login|signup|reset-password|update-password|data-requests)(\/|$)/.test(path);}
let withdrawn=false;
export function analyticsAllowed(){
 if(typeof window==="undefined"||withdrawn||!analyticsPage(window.location.pathname))return false;
 try{return parseConsent(window.localStorage.getItem(CONSENT_KEY))==="accepted";}catch{return false;}
}
export function markWithdrawn(){withdrawn=true;}
let installed=false;
export function installAnalyticsGuard(){
 if(installed)return;installed=true;
 const originalFetch=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  if(analyticsEndpoint(url,window.location.origin)&&!analyticsAllowed())return Promise.resolve(new Response(null,{status:204}));
  return originalFetch(input,init);
 };
 // Plausible engagement flushes bypass transformRequest; the transport guard
 // also blocks those and already-loaded SDKs immediately after withdrawal.
 const originalBeacon=window.navigator.sendBeacon?.bind(window.navigator);
 if(originalBeacon)window.navigator.sendBeacon=(url,data)=>analyticsEndpoint(String(url),window.location.origin)&&!analyticsAllowed()?false:originalBeacon(url,data);
}
