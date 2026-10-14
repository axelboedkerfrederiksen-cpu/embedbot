import type { Workspace, Conversation } from './model.ts';
export function emptyWorkspace(name:string,welcome:string):Workspace {
 return {version:1,revision:0,answerMode:'ai',name,welcome,quoteEnabled:false,quoteLabel:'Få et tilbud',starters:[],campaigns:[],sources:[],tests:[],conversations:[],tickets:[],leads:[],dismissed:[],digest:{enabled:false,weekday:1},installation:{}};
}
export function conversationFromRow(row:{id:string;created_at:string;messages:unknown}):Conversation|null {
 if(!Array.isArray(row.messages))return null;
 const exchanges:{question:string;answer:string}[]=[];
 for(const message of row.messages){
  if(message?.role==='user'&&typeof message.content==='string'&&message.content.trim())exchanges.push({question:message.content,answer:''});
  else if(message?.role==='assistant'&&typeof message.content==='string'&&exchanges.length&&!exchanges.at(-1)!.answer)exchanges.at(-1)!.answer=message.content;
 }
 if(!exchanges.length)return null;
 const meta=row.messages.find(m=>m?.role==='meta');let page='';
 try{page=new URL(meta?.page_url).pathname;}catch{/* Old chats may not have a page. */}
 return {id:row.id,...exchanges[0],exchanges,page,date:row.created_at,
  ...(typeof meta?.response_ms==='number'&&Number.isFinite(meta.response_ms)&&meta.response_ms>=0?{responseMs:meta.response_ms}:{}),
  ...(['complete','interrupted'].includes(meta?.answer_status)?{answerStatus:meta.answer_status}:{}),
 };
}
export function settingsOnly(state:Workspace):Workspace {
 const {dataScope,...settings}=state;void dataScope;
 return {...settings,sources:state.managedBase?state.sources:state.sources.filter(s=>s.id!=="imported-website"),conversations:[],tickets:[],leads:[],starters:state.starters.map(s=>({...s,clicks:0}))};
}
