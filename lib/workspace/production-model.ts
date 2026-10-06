import type { Workspace, Conversation } from './model.ts';
export function emptyWorkspace(name:string,welcome:string):Workspace {
 return {version:1,revision:0,answerMode:'ai',name,welcome,quoteEnabled:false,quoteLabel:'Få et tilbud',starters:[],campaigns:[],sources:[],tests:[],conversations:[],tickets:[],leads:[],dismissed:[],digest:{enabled:false,weekday:1},installation:{}};
}
export function conversationFromRow(row:{id:string;created_at:string;messages:unknown}):Conversation|null {
 if(!Array.isArray(row.messages))return null;
 const user=row.messages.find(m=>m?.role==='user'&&typeof m.content==='string');
 const answer=row.messages.find(m=>m?.role==='assistant'&&typeof m.content==='string');
 if(!user||!answer)return null;
 const meta=row.messages.find(m=>m?.role==='meta');let page='';
 try{page=new URL(meta?.page_url).pathname;}catch{/* Old chats may not have a page. */}
 return {id:row.id,question:user.content,answer:answer.content,page,date:row.created_at};
}
export function settingsOnly(state:Workspace):Workspace {
 return {...state,sources:state.managedBase?state.sources:state.sources.filter(s=>s.id!=="imported-website"),conversations:[],tickets:[],leads:[],starters:state.starters.map(s=>({...s,clicks:0}))};
}
