import { hasGapSignal, insights, questionRecords, type Conversation, type Workspace } from './model.ts';

const DAY = 86_400_000;
export type AnalyticsPeriod = 7 | 30;
const inPeriod = (date:string, from:number, to:number) => Number.isFinite(Date.parse(date)) && Date.parse(date)>=from && Date.parse(date)<to;
const percent = (numerator:number, denominator:number) => denominator ? Math.round(numerator/denominator*1000)/10 : null;
export function percentile(values:number[], fraction:number) {
  const sorted=values.filter(n=>Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);
  return sorted.length ? sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)] : null;
}
function metrics(conversations:Conversation[], state:Workspace, from:number,to:number) {
  const rows=conversations.filter(c=>inPeriod(c.date,from,to));
  const questions=questionRecords(rows);
  const feedback=rows.filter(c=>c.feedback==='yes'||c.feedback==='no');
  const helpful=feedback.filter(c=>c.feedback==='yes').length;
  const durations=rows.flatMap(c=>c.answerStatus==='complete'&&typeof c.responseMs==='number'&&Number.isFinite(c.responseMs)&&c.responseMs>=0?[c.responseMs]:[]);
  const streams=rows.filter(c=>c.answerStatus==='complete'||c.answerStatus==='interrupted');
  const interrupted=streams.filter(c=>c.answerStatus==='interrupted').length;
  return {
    records:rows.length,questions:questions.length,answered:questions.filter(c=>c.answer.trim()).length,
    gapSignals:questions.filter(hasGapSignal).length,feedback:feedback.length,helpful,
    helpfulRate:percent(helpful,feedback.length),feedbackRate:percent(feedback.length,rows.length),
    newLeads:state.leads.filter(l=>inPeriod(l.date,from,to)).length,
    openedTickets:state.tickets.filter(t=>inPeriod(t.date,from,to)).length,
    timedAnswers:durations.length,p50:percentile(durations,.5),p95:percentile(durations,.95),
    streams:streams.length,interrupted,interruptedRate:percent(interrupted,streams.length),
  };
}
const dailyFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'});
function localDateKey(value:Date) {
  const parts=dailyFormatter.formatToParts(value);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type)?.value).join('-');
}
function periodComplete(total:number,loaded:number,oldest:string|undefined,from:number) {
  return loaded>=total || (!!oldest&&Date.parse(oldest)<from);
}
export function workspaceAnalytics(state:Workspace,days:AnalyticsPeriod=7,now=new Date(state.dataScope?.readAt||Date.now())) {
  const to=now.getTime(),from=to-days*DAY,previousFrom=from-days*DAY;
  const current=metrics(state.conversations,state,from,to),previous=metrics(state.conversations,state,previousFrom,from);
  const recent=state.conversations.filter(c=>inPeriod(c.date,from,to));
  const questions=questionRecords(recent);
  const scope=state.dataScope;
  const oldest=(rows:{date:string}[])=>rows.map(r=>r.date).filter(d=>Number.isFinite(Date.parse(d))).sort()[0];
  const complete=scope?periodComplete(scope.conversations.total,scope.conversations.loaded,scope.conversations.oldestAt,from):true;
  const comparisonComplete=scope?periodComplete(scope.conversations.total,scope.conversations.loaded,scope.conversations.oldestAt,previousFrom):true;
  const leadsComplete=scope?periodComplete(scope.leads.total,scope.leads.loaded,oldest(state.leads),from):true;
  const ticketsComplete=scope?periodComplete(scope.tickets.total,scope.tickets.loaded,oldest(state.tickets),from):true;
  const dailyMap=new Map<string,{date:string;questions:number;feedback:number;negative:number;gapSignals:number}>();
  const first=localDateKey(new Date(from)),last=localDateKey(new Date(to-1));
  for(let date=new Date(first+'T12:00:00Z');date.toISOString().slice(0,10)<=last;date=new Date(date.getTime()+DAY)) {
    const key=date.toISOString().slice(0,10);dailyMap.set(key,{date:key,questions:0,feedback:0,negative:0,gapSignals:0});
  }
  for(const q of questions){const day=dailyMap.get(localDateKey(new Date(q.date)));if(day){day.questions++;if(hasGapSignal(q))day.gapSignals++;}}
  for(const c of recent){const day=dailyMap.get(localDateKey(new Date(c.date)));if(day&&c.feedback){day.feedback++;if(c.feedback==='no')day.negative++;}}
  const pageMap=new Map<string,{path:string;questions:number;gapSignals:number}>();
  for(const q of questions){const path=q.page.startsWith('/')&&!q.page.startsWith('//')?q.page.split(/[?#]/)[0]:'Ukendt side';const page=pageMap.get(path)||{path,questions:0,gapSignals:0};page.questions++;if(hasGapSignal(q))page.gapSignals++;pageMap.set(path,page);}
  const age=(date:string)=>Number.isFinite(Date.parse(date))?Math.max(0,(to-Date.parse(date))/3_600_000):null;
  const openTickets=state.tickets.filter(t=>t.status!=='closed');
  const openLeads=state.leads.filter(l=>l.status==='new');
  const replies=state.tickets.flatMap(t=>t.entries.filter(e=>e.kind==='reply'));
  const expected=state.tests.filter(t=>t.expected.trim());
  const latestSourceChange=Math.max(0,...state.sources.map(s=>Date.parse(s.updatedAt)||0));
  const tests={total:state.tests.length,withCriteria:expected.length,passed:expected.filter(t=>t.matched===true&&!!t.checkedAt&&Date.parse(t.checkedAt)>=latestSourceChange).length,failed:expected.filter(t=>t.matched===false&&!!t.checkedAt&&Date.parse(t.checkedAt)>=latestSourceChange).length,unrun:expected.filter(t=>!t.checkedAt).length,stale:expected.filter(t=>!!t.checkedAt&&Date.parse(t.checkedAt)<latestSourceChange).length};
  return {
    from:new Date(from).toISOString(),to:new Date(to).toISOString(),days,previousFrom:new Date(previousFrom).toISOString(),current,previous,
    change:{absolute:current.questions-previous.questions,percent:previous.questions?Math.round((current.questions-previous.questions)/previous.questions*1000)/10:null},
    coverage:{complete,comparisonComplete,leadsComplete,ticketsComplete,feedbackComplete:!scope?.feedback||scope.feedback.loaded>=scope.feedback.total,loaded:scope?.conversations.loaded??state.conversations.length,total:scope?.conversations.total??state.conversations.length,excluded:scope?.conversations.excluded??0,invalidDates:state.conversations.filter(c=>!Number.isFinite(Date.parse(c.date))).length,oldestAt:scope?.conversations.oldestAt??oldest(state.conversations)},
    daily:[...dailyMap.values()],pages:[...pageMap.values()].sort((a,b)=>b.questions-a.questions).slice(0,8),
    opportunities:insights(recent,now,days).filter(g=>!state.dismissed.includes(g.id)).slice(0,3),
    queue:{openTickets:scope?.openTickets??openTickets.length,openLeads:scope?.openLeads??openLeads.length,pendingReplies:scope?.pendingReplies??replies.filter(e=>e.deliveryStatus==='pending').length,failedReplies:scope?.failedReplies??replies.filter(e=>e.deliveryStatus==='failed').length,oldestHours:age(scope?.oldestOpenTicketAt||oldest(openTickets)||''),tickets:openTickets.filter(t=>Number.isFinite(Date.parse(t.date))&&Date.parse(t.date)<to).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,4).map(t=>({id:t.id,number:t.number,status:t.status,ageHours:age(t.date)}))},
    tests,sources:{total:state.sources.length,pending:state.sources.filter(s=>s.pendingText).length,truncated:state.sources.filter(s=>s.truncated).length,errors:state.sources.filter(s=>s.error).length},
    installation:{lastSeenAt:state.installation.lastSeenAt,ageHours:state.installation.lastSeenAt?age(state.installation.lastSeenAt):null,page:state.installation.page?.split(/[?#]/)[0]},
  };
}
export type WorkspaceAnalytics = ReturnType<typeof workspaceAnalytics>;
export function analyticsCsv(report:WorkspaceAnalytics) {
  return ['dato,spørgsmål,feedback,negativ_feedback,signaler_om_videnshul',...report.daily.map(d=>[d.date,d.questions,d.feedback,d.negative,d.gapSignals].join(','))].join('\r\n');
}
export function analyticsText(report:WorkspaceAnalytics,name:string) {
  const c=report.current;
  return `${name} · ${report.days} dages overblik\n${report.from} → ${report.to}\n\n${c.questions} registrerede spørgsmål (${c.records} poster)\n${c.newLeads} leads oprettet i perioden\n${c.openedTickets} supportsager oprettet i perioden\n${report.queue.openTickets} åbne supportsager nu\n${report.queue.openLeads} leads afventer første kontakt\n${c.helpful} af ${c.feedback} tilbagemeldinger var positive\n${c.gapSignals} spørgsmål med signal om manglende hjælp (regelbaseret)\n\nMålt AI-svartid: ${c.timedAnswers} svar\nP50: ${c.p50??'ikke målt'} ms · P95: ${c.p95??'ikke målt'} ms\n${c.interrupted} af ${c.streams} målte streams blev afbrudt\n\nDatagrundlag: ${report.coverage.loaded} af ${report.coverage.total} gemte poster. ${report.coverage.complete?'Hele spørgsmålsperioden er dækket.':'Spørgsmålstallene er et udsnit.'}\nLeads i perioden: ${report.coverage.leadsComplete?'hele perioden':'udsnit'}. Supportsager i perioden: ${report.coverage.ticketsComplete?'hele perioden':'udsnit'}.\n\nNæste skridt:\n${report.opportunities.map(g=>`${g.title} (${g.count} spørgsmål): ${g.suggestion}`).join('\n')}\n\nPerioderne er rullende og afsluttes ved opdateringstidspunktet. Dagstal bruger Europe/Copenhagen. Feedback er et frivilligt udsnit. Svartid måler AI-generering på serveren, ikke kundens netværk. Ingen påstand om omsætning eller automatisk løsning.\n`;
}
