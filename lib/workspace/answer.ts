import OpenAI from "openai";
import { buildChatSystemPrompt } from "../chat-system-prompt.ts";
import { activeCampaigns, sourceExcerpts, type Workspace, type Message } from "./model.ts";
export async function answerWorkspace(state: Workspace, question: string, history: Message[] = []) {
  const excerpts = sourceExcerpts(state.sources,question);
  const context = excerpts.map(e=>`Kilde: ${e.source.name}\n${e.text}`).join("\n\n");
  if (state.answerMode !== "ai") {
    const relevant=excerpts.filter(e=>e.score>0);
    const campaigns=activeCampaigns(state);
    const announcement=campaigns.map(c=>`${c.title}: ${c.text}`).join("\n");
    const answer=question.startsWith("Skriv et kort svarudkast")
      ? `Hej, tak for din henvendelse.\n\n${relevant[0]?.text || "Vi undersøger dit spørgsmål og vender tilbage."}\n\nVenlig hilsen\n${state.name}`
      : `${relevant.length ? relevant.map(e=>e.text).join("\n\n") : "Jeg mangler oplysninger om dette spørgsmål. Du kan oprette en henvendelse, så virksomheden kan hjælpe dig videre."}${announcement ? `\n\nAktuel besked fra virksomheden:\n${announcement}` : ""}`;
    return {answer,sources:relevant.map(e=>e.source.name),excerpts:relevant.map(e=>({name:e.source.name,text:e.text})),mode:"sources"};
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("AI-test kræver den eksisterende OpenAI-opsætning. Du kan stadig redigere og prøve alle andre funktioner.");
  const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:30000,maxRetries:0});
  const result = await openai.chat.completions.create({ model:"gpt-5.6-luna",reasoning_effort:"none",max_completion_tokens:600,messages:[
    {role:"system",content:buildChatSystemPrompt({companyName:state.name,businessInfo:`Virksomhed: ${state.name}\nKontaktmail: hej@example.org\nAktuelle beskeder fra virksomheden:\n${activeCampaigns(state).map(c=>c.text).join("\n") || "Ingen"}`,websiteContext:context || "Ingen videnskilder endnu.",language:"dansk",formal:false,capabilities:{products:false,orders:false,supportCases:true,supportEmail:false}})},
    ...history.slice(-10),{role:"user",content:question.slice(0,2000)},
  ]}).catch((error: unknown) => {
    const status=(error as {status?:number})?.status;
    throw new Error(status===401 ? "AI-forbindelsen afviser serverens nøgle. Kontrollér den lokale AI-opsætning." : status===429 ? "AI-forbindelsen har nået sin grænse. Prøv igen senere." : "AI-forbindelsen kunne ikke levere et svar. Prøv igen eller kontrollér opsætningen.");
  });
  const answer = result.choices[0]?.message.content?.trim();
  if (!answer) throw new Error("Der kom ikke et testsvar. Prøv igen.");
  return {answer,sources:excerpts.map(e=>e.source.name),excerpts:excerpts.map(e=>({name:e.source.name,text:e.text})),mode:"ai"};
}
