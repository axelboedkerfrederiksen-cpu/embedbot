import { activeCampaigns, startersForPath, type Workspace } from "./model.ts";
export function workspaceWidgetConfig(state:Workspace,path:string) {
  return {name:state.name,welcome_message:state.welcome,primary_color:"#ffffff",secondary_color:"#f4f1eb",fab_color:"#232321",font_choice:"Inter",local_workspace:true,answer_mode:state.answerMode||"sources",quote_enabled:state.quoteEnabled!==false,quote_label:state.quoteLabel||"Få et tilbud",start_buttons:startersForPath(state.starters,path),announcements:activeCampaigns(state).map(c=>({title:c.title,text:c.text}))};
}
