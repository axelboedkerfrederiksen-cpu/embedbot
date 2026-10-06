import { weeklySummary, type Workspace } from "./model.ts";
const zone="Europe/Copenhagen";
// Find a wall-clock occurrence at 09:00 in Copenhagen. Offsets are determined
// for the target date so a week crossing daylight-saving time stays at 09:00.
function atNine(year:number,month:number,day:number) {
  const guess=new Date(Date.UTC(year,month-1,day,9));
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(guess);
  const hour=Number(parts.find(p=>p.type==="hour")?.value);const minute=Number(parts.find(p=>p.type==="minute")?.value);
  return new Date(guess.getTime()-((hour-9)*60+minute)*60000);
}
export function lastDigestOccurrence(weekday:number, now=new Date()) {
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value);
  const day=new Date(Date.UTC(get("year"),get("month")-1,get("day")));
  const delta=(day.getUTCDay()-weekday+7)%7;day.setUTCDate(day.getUTCDate()-delta);
  let occurrence=atNine(day.getUTCFullYear(),day.getUTCMonth()+1,day.getUTCDate());
  if(occurrence>now){day.setUTCDate(day.getUTCDate()-7);occurrence=atNine(day.getUTCFullYear(),day.getUTCMonth()+1,day.getUTCDate());}
  return occurrence;
}
export function nextDigestOccurrence(weekday:number,now=new Date()) {
  const last=lastDigestOccurrence(weekday,now);
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(last);
  const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value);
  const next=new Date(Date.UTC(get("year"),get("month")-1,get("day")+7));
  return atNine(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate());
}
export function generateDigest(state:Workspace,now=new Date(),scheduled=false){
  if(scheduled&&(!state.digest.enabled||Date.parse(state.digest.lastGeneratedAt||"1970-01-01")>=lastDigestOccurrence(state.digest.weekday,now).getTime()))return false;
  const report=weeklySummary(state,now);
  state.digest.lastGeneratedAt=now.toISOString();
  state.digest.report={from:report.from,to:report.to,count:report.count,feedbackCount:report.feedbackCount,helpful:report.helpful,awaiting:report.awaiting,newLeads:report.newLeads,opportunities:report.opportunities.map(({id,title,count,suggestion,missing})=>({id,title,count,suggestion,missing}))};
  return true;
}
