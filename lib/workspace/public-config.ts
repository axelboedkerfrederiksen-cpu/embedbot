import { activeCampaigns,startersForPath,type Workspace } from './model.ts';
export function publicWorkspaceConfig(state:Workspace|null,path:string){
 return {workspace_enabled:true,quote_enabled:state?.quoteEnabled===true,quote_label:state?.quoteLabel||'Få et tilbud',start_buttons:state?startersForPath(state.starters,path).map(({id,label,message,path})=>({id,label,message,path})):[],announcements:state?activeCampaigns(state).map(c=>({title:c.title,text:c.text})):[]};
}
