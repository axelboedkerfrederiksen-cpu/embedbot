import { selectWebsiteContext } from "../chat-context.ts";
export type Message = { role: "user" | "assistant"; content: string };
export type Conversation = { id: string; question: string; answer: string; page: string; date: string; email?: string; feedback?: "yes" | "no"; feedbackNote?: string };
export type Source = { id: string; name: string; kind: "text" | "url" | "pdf"; text: string; updatedAt: string; pendingText?: string; checkedAt?: string; error?: string; truncated?: boolean };
export type Starter = { id: string; label: string; message: string; path: string; clicks: number };
export type Campaign = { id: string; title: string; text: string; startsAt: string; endsAt: string; enabled: boolean };
export type TestCase = { id: string; question: string; expected: string; answer?: string; sources?: string[]; checkedAt?: string; matched?: boolean };
export type TicketEntry = { id: string; kind: "note" | "reply"; text: string; date: string };
export type Ticket = { id: string; number: number; email: string; description: string; status: "new" | "in_progress" | "closed"; date: string; entries: TicketEntry[] };
export type Lead = { id: string; email: string; need: string; budget: string; timing: string; page: string; conversationId?: string; status: "new" | "contacted" | "closed"; note: string; date: string };
export type Workspace = { version: number; answerMode?: "sources"|"ai"; revision: number; name: string; welcome: string; quoteEnabled?:boolean; quoteLabel?:string; starters: Starter[]; campaigns: Campaign[]; sources: Source[]; tests: TestCase[]; conversations: Conversation[]; tickets: Ticket[]; leads: Lead[]; dismissed: string[]; addressed?: Record<string,{sourceId:string;date:string}>; digest: { enabled: boolean; weekday: number; lastGeneratedAt?: string; report?: {from:string;to:string;count:number;feedbackCount:number;helpful:number;awaiting:number;newLeads:number;opportunities:{id:string;title:string;count:number;suggestion:string;missing:boolean}[]} }; installation: { lastSeenAt?: string; page?: string; error?: string } };
export type Insight = { id: string; title: string; count: number; examples: Conversation[]; missing: boolean; suggestion: string };
export function activeCampaigns(state: Pick<Workspace, "campaigns">, now = new Date()) {
  return state.campaigns.filter(c => c.enabled && Date.parse(c.startsAt) <= now.getTime() && now.getTime() < Date.parse(c.endsAt));
}
export function startersForPath(starters: Starter[], path: string) {
  return starters.filter(s => !s.path || (s.path.endsWith("*") ? path.startsWith(s.path.slice(0, -1)) : path === s.path));
}
export function campaignStatus(c: Campaign, now = new Date()) {
  return !c.enabled ? "Slået fra" : Date.parse(c.endsAt) <= now.getTime() ? "Udløbet" : Date.parse(c.startsAt) > now.getTime() ? "Planlagt" : "Aktiv";
}
const topics = [
  { key: "size", title: "Kunderne er usikre på størrelsen", regex: /størrels|stor er|mål\b|dimension|passer|diameter/, suggestion: "Tilføj tydelige mål og en størrelsesguide på produktsiden." },
  { key: "delivery", title: "Spørgsmål om levering og fragt", regex: /lever|fragt|forsend/, suggestion: "Gør fragtprisen og leveringstiden synlige før checkout." },
  { key: "returns", title: "Usikkerhed om retur og tilbudsvarer", regex: /retur|return|bytte|tilbudsvar/, suggestion: "Forklar returvilkårene tydeligt, også for tilbudsvarer." },
  { key: "product", title: "Manglende produktinformation", regex: /dæmp|pære|material|vedligehold|vask/, suggestion: "Udbyg produktbeskrivelsen med de egenskaber, kunderne efterspørger." },
  { key: "quote", title: "Kunderne ønsker rådgivning eller tilbud", regex: /tilbud|budget|projekt|rådgiv/, suggestion: "Tilbyd en enkel vej til et tilbud med behov, budget og tidspunkt." },
];
export function insights(conversations: Conversation[], now = new Date(), days = 7): Insight[] {
  const cutoff = now.getTime() - days * 86400000;
  const groups = new Map<string, Insight>();
  for (const c of conversations.filter(c => Date.parse(c.date) >= cutoff && Date.parse(c.date) <= now.getTime())) {
    const normalized = c.question.toLocaleLowerCase("da");
    const topic = topics.find(t => t.regex.test(normalized));
    const key = topic?.key || normalized.replace(/[?!.,]/g, "").trim();
    const missing = /ved (?:det )?ikke|kan ikke (?:bekræfte|svare)|kontakt (?:os|support)|mangler oplysninger/i.test(c.answer) || c.feedback === "no";
    const current = groups.get(key) || { id: key, title: topic?.title || c.question, count: 0, examples: [], missing: false, suggestion: topic?.suggestion || "Tilføj et konkret svar, og test det med kundens spørgsmål." };
    current.count++; current.examples.push(c); current.missing ||= missing; groups.set(key, current);
  }
  return [...groups.values()].sort((a,b) => Number(b.missing) - Number(a.missing) || b.count - a.count);
}
export function findConflicts(sources: Source[]) {
  const values: { source: string; value: string }[] = [];
  for (const s of sources) {
    const matches = s.text.match(/\b\d+\s*(?:[-–]\s*\d+)?\s*hverdage\b/gi) || [];
    for (const value of new Set(matches.map(m => m.toLowerCase().replace(/\s/g, "").replace("–", "-")))) values.push({ source: s.name, value });
  }
  return new Set(values.map(v => v.value)).size > 1 ? values : [];
}
export function sourceExcerpts(sources: Source[], question: string) {
  const words = (question.toLocaleLowerCase("da").match(/[a-zæøå0-9]{3,}/g) || []).map(w=>w.replace(/^return.*|^retur.*/,"retur").replace(/^lever.*/,"lever").replace(/^tilbud.*/,"tilbud").replace(/^dæmp.*/,"dæmp"));
  return sources.map(source => {
    const paragraphs = source.text.split(/\n\s*\n/).filter(Boolean);
    const ranked = paragraphs.map(text => ({ text, score: words.reduce((sum,w) => sum + Number(text.toLocaleLowerCase("da").includes(w)), 0) })).sort((a,b) => b.score-a.score);
    return { source, score: ranked[0]?.score || 0, text: selectWebsiteContext((ranked.some(p=>p.score>0)?ranked.filter(p=>p.score>0):ranked.slice(0,1)).slice(0,3).map(p=>p.text).join("\n\n"),question,[],4000) };
  }).sort((a,b) => b.score-a.score).slice(0,5);
}
export function weeklySummary(state: Workspace, now = new Date()) {
  const recent = state.conversations.filter(c => Date.parse(c.date) >= now.getTime()-7*86400000 && Date.parse(c.date)<=now.getTime());
  const groups = insights(recent, now);
  const feedback = recent.filter(c=>c.feedback);
  return { from: new Date(now.getTime()-7*86400000).toISOString(), to: now.toISOString(), count: recent.length, feedbackCount: feedback.length, helpful: feedback.filter(c=>c.feedback==="yes").length, awaiting: state.tickets.filter(t=>t.status!=="closed").length, opportunities: groups.filter(g=>!state.dismissed.includes(g.id)).slice(0,3), newLeads: state.leads.filter(l=>l.status==="new").length };
}
export function seedWorkspace(now = new Date()): Workspace {
  const ago = (hours: number) => new Date(now.getTime()-hours*3600000).toISOString();
  const questions: [string,string,string,string?][] = [
    ["Kan lampen dæmpes?", "Det ved jeg ikke. Kontakt os for hjælp.", "/produkter/lampe", "ida@example.org"],
    ["Hvilken pære skal jeg bruge i lampen?", "Jeg mangler oplysninger om pæren. Kontakt os.", "/produkter/lampe"],
    ["Er lampen dæmpbar?", "Jeg kan ikke bekræfte det ud fra vores oplysninger.", "/produkter/lampe"],
    ["Hvor lang leveringstid har spisebordet?", "Vi leverer normalt inden for 2-4 hverdage.", "/produkter/bord"],
    ["Hvad koster fragt på møbler?", "Det ved jeg ikke. Kontakt os for den aktuelle fragtpris.", "/levering"],
    ["Hvor stor er lampen?", "Lampen er 42 cm høj og har en diameter på 28 cm.", "/produkter/lampe"],
    ["Passer spisebordet i en lille lejlighed?", "Bordet er 160 x 90 cm. Mål gerne rummet og pladsen omkring det.", "/produkter/bord"],
    ["Kan jeg returnere en vare købt på tilbud?", "Ja, vi har 30 dages returret, også på tilbudsvarer.", "/retur"],
    ["Jeg vil gerne have et tilbud på indretning af et kontor", "Du kan oprette en henvendelse med dit behov.", "/kontakt", "mads@example.org"],
    ["Hvordan vedligeholder jeg bordet?", "Det ved jeg ikke. Kontakt os for korrekt vejledning.", "/produkter/bord"],
  ];
  return { version: 1, answerMode:"sources", revision: 0, name: "Nordic Living",quoteEnabled:true,quoteLabel:"Få et tilbud", welcome: "Hej 👋 Hvad kan jeg hjælpe dig med i dag?", starters: [
    { id:"start-delivery",label:"Levering & fragt",message:"Hvad er jeres leveringstid?",path:"",clicks:0 },
    { id:"start-return",label:"Retur & ombytning",message:"Hvordan returnerer jeg en vare?",path:"",clicks:0 },
    { id:"start-help",label:"Hjælp til produktet",message:"Kan du hjælpe mig med at vælge et produkt?",path:"/produkter/*",clicks:0 },
  ], campaigns: [], sources: [
    { id:"source-delivery",name:"Levering og retur",kind:"text",text:"Levering\nVi leverer normalt inden for 2-4 hverdage i Danmark.\n\nRetur\nDu har 30 dages returret. Det gælder også varer købt på tilbud. Kontakt hej@example.org for returvejledning.",updatedAt:ago(24) },
    { id:"source-products",name:"Produkter og mål",kind:"text",text:"Lampen Nord\nLampen er 42 cm høj og har en diameter på 28 cm. Den er fremstillet af metal.\n\nSpisebordet Eg\nSpisebordet er 160 x 90 cm og er fremstillet af egetræ.",updatedAt:ago(48) },
  ], tests: [ {id:"test-delivery",question:"Hvor hurtigt leverer I?",expected:"2-4 hverdage"}, {id:"test-return",question:"Kan jeg returnere tilbudsvarer?",expected:"30 dage"} ],
    conversations: questions.map(([question,answer,page,email],i)=>({id:`conversation-${i+1}`,question,answer,page,email,date:ago(i*9+1),...(i===0?{feedback:"no" as const,feedbackNote:"Jeg ville gerne vide, om den kan dæmpes."}:i===3||i===7?{feedback:"yes" as const}:{})})),
    tickets:[{id:"ticket-1",number:1042,email:"ida@example.org",description:"Kan I bekræfte, om lampen Nord er dæmpbar, og hvilken pære jeg skal bruge?",status:"new",date:ago(5),entries:[]},{id:"ticket-2",number:1043,email:"mads@example.org",description:"Vi ønsker et tilbud på indretning af et kontor med 12 arbejdspladser.",status:"in_progress",date:ago(20),entries:[]}],
    leads:[{id:"lead-1",email:"mads@example.org",need:"Indretning af kontor med 12 arbejdspladser",budget:"50.000–75.000 kr.",timing:"Inden december",page:"/kontakt",conversationId:"conversation-9",status:"new",note:"",date:ago(20)}],
    dismissed:[],digest:{enabled:false,weekday:1},installation:{} };
}
