import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceAnalytics, percentile, analyticsCsv, analyticsText } from '../lib/workspace/analytics.ts';
import { emptyWorkspace, conversationFromRow, settingsOnly } from '../lib/workspace/production-model.ts';
import { weeklySummary, type Conversation } from '../lib/workspace/model.ts';
const now=new Date('2026-10-26T12:00:00Z');
const DAY=86_400_000;
const at=(days:number)=>new Date(now.getTime()-days*DAY).toISOString();
const chat=(id:string,date:string):Conversation=>({id,date,question:'Levering?',answer:'2 dage',page:'/levering'});

test('rolling periods have exclusive ends, no overlapping comparison, and all historical exchanges count',()=>{
 const state=emptyWorkspace('Shop','');
 state.conversations=[chat('start',at(7)),chat('before',at(7.001)),chat('end',at(0)),chat('future',at(-1)),chat('invalid','invalid')];
 state.conversations[0].exchanges=[{question:'Levering?',answer:'2 dage'},{question:'Fragt?',answer:''}];
 const a=workspaceAnalytics(state,7,now);
 assert.equal(a.current.questions,2);assert.equal(a.current.records,1);assert.equal(a.current.answered,1);assert.equal(a.previous.questions,1);
 assert.equal(a.current.gapSignals,1);assert.equal(a.coverage.invalidDates,1);assert.equal(a.daily.reduce((sum,d)=>sum+d.questions,0),2);
});
test('new leads are period creations regardless of current status, open leads and cases are a current snapshot',()=>{
 const state=emptyWorkspace('Shop','');
 state.leads=[{id:'old',date:at(100),status:'new'},{id:'recent',date:at(1),status:'closed'},{id:'future',date:at(-1),status:'contacted'}].map(l=>({...l,status:l.status as 'new'|'closed'|'contacted',email:'test@example.org',need:'quote',budget:'',timing:'',page:'/',note:''}));
 state.tickets=[{id:'t',date:at(10),number:1,status:'new',email:'test@example.org',description:'Help',entries:[]}];
 assert.equal(workspaceAnalytics(state,7,now).current.newLeads,1);assert.equal(weeklySummary(state,now).newLeads,1);
 assert.equal(workspaceAnalytics(state,7,now).queue.openLeads,1);assert.equal(workspaceAnalytics(state,7,now).queue.openTickets,1);
});
test('limited row windows do not masquerade as complete periods; exact open queues remain exact',()=>{
 const state=emptyWorkspace('Shop','');state.conversations=[chat('c',at(1))];
 state.dataScope={readAt:now.toISOString(),conversations:{total:2000,loaded:1000,excluded:0,oldestAt:at(4)},tickets:{total:400,loaded:300},leads:{total:500,loaded:300},entries:{total:1500,loaded:1000},openTickets:375,openLeads:450,pendingReplies:20,failedReplies:3,oldestOpenTicketAt:at(100)};
 let a=workspaceAnalytics(state,7);
 assert.equal(a.coverage.complete,false);assert.equal(a.coverage.comparisonComplete,false);assert.equal(a.coverage.leadsComplete,false);
 assert.equal(a.queue.openTickets,375);assert.equal(a.queue.openLeads,450);assert.equal(a.queue.failedReplies,3);assert.equal(a.queue.oldestHours,2400);
 state.dataScope.conversations.oldestAt=at(7);assert.equal(workspaceAnalytics(state,7).coverage.complete,false);
 state.dataScope.conversations.oldestAt=at(10);a=workspaceAnalytics(state,7);
 assert.equal(a.coverage.complete,true);assert.equal(a.coverage.comparisonComplete,false);
 assert.equal(settingsOnly(state).dataScope,undefined);
});
test('feedback denominators are records, not questions or assumed resolved chats',()=>{
 const state=emptyWorkspace('Shop','');state.conversations=[chat('a',at(1)),chat('b',at(2)),chat('c',at(3))];
 state.conversations[0].feedback='yes';state.conversations[0].exchanges=[{question:'q',answer:'a'},{question:'q2',answer:'a2'}];state.conversations[1].feedback='no';
 const a=workspaceAnalytics(state,7,now);assert.equal(a.current.questions,4);assert.equal(a.current.feedback,2);assert.equal(a.current.helpfulRate,50);assert.equal(a.current.feedbackRate,66.7);
 assert.equal(workspaceAnalytics(emptyWorkspace('empty',''),7,now).current.helpfulRate,null);
});
test('nearest-rank latency excludes unknown old measurements and stream percentages use recorded status only',()=>{
 const state=emptyWorkspace('Shop','');state.conversations=[chat('old',at(1)),...Array.from({length:20},(_,i)=>({...chat(String(i),at(1)),responseMs:(i+1)*100,answerStatus:i===19?'interrupted' as const:'complete' as const}))];
 const a=workspaceAnalytics(state,7,now);assert.equal(a.current.timedAnswers,19);assert.equal(a.current.p50,1000);assert.equal(a.current.p95,1900);assert.equal(a.current.interruptedRate,5);
 assert.equal(percentile([],0.95),null);assert.equal(percentile([NaN,-1,0,100],.5),0);
});
test('Copenhagen daily counts survive autumn DST and page addresses omit query strings',()=>{
 const state=emptyWorkspace('Shop','');state.conversations=[chat('a','2026-10-24T22:30:00Z'),chat('b','2026-10-25T22:30:00Z')];
 state.conversations[0].page='/levering?email=private#test';state.conversations[1].page='';
 const a=workspaceAnalytics(state,7,now);assert.equal(a.daily.find(d=>d.date==='2026-10-25')?.questions,2);
 assert.equal(a.pages[0].path,'/levering');assert.equal(a.pages[1].path,'Ukendt side');assert.ok(!analyticsCsv(a).includes('private'));
 assert.equal(a.change.percent,null);assert.ok(!analyticsText(a,'Shop').includes('NaN'));
});
test('source changes flag old tests and expected-free tests do not count as passes',()=>{
 const state=emptyWorkspace('Shop','');state.sources=[{id:'s',name:'Info',kind:'text',text:'Knowledge',updatedAt:at(1)}];
 state.tests=[{id:'a',question:'q',expected:'good',matched:true,checkedAt:at(2)},{id:'b',question:'q',expected:'',matched:true,checkedAt:at(1)},{id:'c',question:'q',expected:'new'}];
 const a=workspaceAnalytics(state,7,now);assert.equal(a.tests.total,3);assert.equal(a.tests.withCriteria,2);assert.equal(a.tests.passed,0);assert.equal(a.tests.stale,1);assert.equal(a.tests.unrun,1);
});
test('row parsing handles malformed history, unanswered follow-ups and metadata without adding samples',()=>{
 const c=conversationFromRow({id:'x',created_at:at(1),messages:[null,{role:'user',content:'Q'},{role:'assistant',content:'A'},{role:'user',content:'Follow up'},{role:'meta',page_url:'https://shop.test/page?token=private',response_ms:0,answer_status:'interrupted'}]});
 assert.equal(c?.exchanges?.length,2);assert.equal(c?.exchanges?.[1].answer,'');assert.equal(c?.responseMs,0);assert.equal(c?.page,'/page');assert.equal(c?.answerStatus,'interrupted');
 assert.equal(conversationFromRow({id:'x',created_at:at(1),messages:[{role:'assistant',content:'No user'}]}),null);
});
