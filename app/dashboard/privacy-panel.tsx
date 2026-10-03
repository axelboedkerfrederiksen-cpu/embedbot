"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { ShieldCheck,FileCheck2,Search } from "lucide-react";
import { commerceRequest } from "@/lib/commerce-request";
import { TERMS,DPA } from "@/lib/compliance/legal";
import { DEFAULT_CHAT_RETENTION_DAYS,DEFAULT_TICKET_RETENTION_DAYS } from "@/lib/compliance/retention";
import styles from "./dashboard.module.css";
import ui from "./commerce.module.css";
type Settings={customerPrivacyUrl:string;ticketRetentionDays:number;chatRetentionDays:number;lastCleanup:string|null};
type Acceptance={slug:string;version:string;accepted_at:string};
type VisitorRecord={kind:string;id:string;record:Record<string,unknown>};
function downloadJson(value:unknown,filename:string){
 const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url);
}
export default function PrivacyPanel({businessId,demo=false}:{businessId:string;demo?:boolean}){
 const [settings,setSettings]=useState<Settings>({customerPrivacyUrl:"",ticketRetentionDays:DEFAULT_TICKET_RETENTION_DAYS,chatRetentionDays:DEFAULT_CHAT_RETENTION_DAYS,lastCleanup:null});const [acceptances,setAcceptances]=useState<Acceptance[]>([]);const [ready,setReady]=useState(demo);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState("");const [accept,setAccept]=useState(false);
 const [kind,setKind]=useState("email");const [value,setValue]=useState("");const [verified,setVerified]=useState(false);const [records,setRecords]=useState<VisitorRecord[]|null>(null);const [confirmDelete,setConfirmDelete]=useState(false);const [limited,setLimited]=useState(false);
 useEffect(()=>{
  if(demo)return;const controller=new AbortController();
  Promise.all([commerceRequest(`/api/dashboard/privacy?business_id=${businessId}`,undefined,controller.signal),commerceRequest(`/api/dashboard/legal?business_id=${businessId}`,undefined,controller.signal)]).then(([privacy,legal])=>{setSettings(privacy);setAcceptances(legal.acceptances);setReady(true);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();
 },[businessId,demo]);
 async function action(name:string,run:()=>Promise<void>){setBusy(name);setError("");setNotice("");try{await run();}catch(e){setError(e instanceof Error?e.message:"Handlingen kunne ikke gennemføres.");}finally{setBusy("");}}
 async function visitor(actionName:"search"|"export"|"delete"){
  const result=await commerceRequest("/api/dashboard/visitor-data",{business_id:businessId,action:actionName,kind,value,identityVerified:verified,confirmDelete});
  if(actionName==="delete"){setRecords(null);setConfirmDelete(false);setNotice(`${result.deleted} records blev slettet. Gennemgå også historiske kopier og andre modtageres oplysninger.`);return;}
  if(actionName==="search"){setRecords(result.records);setLimited(result.searchLimited);return;}
  downloadJson(result,"embedbot-visitor-export.json");setNotice("Eksporten er klargjort til download. Del den kun via en sikker kanal efter identitetskontrol.");
 }
 const disabled=demo||!ready||Boolean(busy);
 function resetSearch(){setRecords(null);setVerified(false);setConfirmDelete(false);}
 return <div className={ui.stack}>
  {error?<div className={styles.errorBanner} role="alert">{error}</div>:null}{notice?<div className={styles.infoBanner} role="status">{notice}</div>:null}
  {demo?<div className={styles.infoBanner}>Forhåndsvisning. Ændringer og datahandlinger er slået fra.</div>:null}
  <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div className={ui.icon}><ShieldCheck size={21}/></div><div><h2>Privatliv og opbevaring</h2><p>Informér dine besøgende og godkend de perioder, din virksomhed har brug for.</p></div></div>
   <form className={ui.form} onSubmit={e=>{e.preventDefault();void action("save",async()=>{await commerceRequest("/api/dashboard/privacy",{business_id:businessId,...settings});setNotice("Privatlivsindstillingerne er gemt.");});}}>
    <label className={ui.field}>Customer Privacy Policy URL<input type="url" placeholder="https://jeres-webshop.dk/privatliv" maxLength={2048} value={settings.customerPrivacyUrl} onChange={e=>setSettings({...settings,customerPrivacyUrl:e.target.value})}/></label>
    <p className={ui.hint}>Widgettens “Privatliv” fører til jeres HTTPS-politik. EmbedBots information er altid tilgængelig via “Drevet af EmbedBot”.</p>
    <div className={ui.twoColumns}><label className={ui.field}>Samtaler — dage<input type="number" min={1} max={3650} required value={settings.chatRetentionDays} onChange={e=>setSettings({...settings,chatRetentionDays:Number(e.target.value)})}/></label><label className={ui.field}>Supportsager — dage<input type="number" min={1} max={3650} required value={settings.ticketRetentionDays} onChange={e=>setSettings({...settings,ticketRetentionDays:Number(e.target.value)})}/></label></div>
    <p className={ui.hint}>Udgangspunktet er 30 dage for samtaler og leads og 90 dage for supportsager. Jeres gemte perioder gælder, indtil I ændrer dem. Kopierede samtaleudsnit følger den kortere relevante periode. En kortere periode kan medføre permanent sletning ved næste oprydning. Downloadede kopier skal I selv håndtere og slette.</p>
    <button className={styles.button} disabled={disabled}>Gem indstillinger</button>
   </form><p className={ui.hint}>Seneste registrerede succesfulde oprydning: {settings.lastCleanup?new Date(settings.lastCleanup).toLocaleString("da-DK"):"Ingen registrering endnu — drift skal kontrolleres."}</p>
  </section>
  <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div className={ui.icon}><FileCheck2 size={21}/></div><div><h2>Aftaler og versioner</h2><p>Ingen tidligere kunder er automatisk registreret som accepterende.</p></div></div>
   <p className={ui.hint}><Link href="/terms" target="_blank">Vilkår {TERMS.version}</Link> · <Link href="/dpa" target="_blank">DPA {DPA.version} — udkast</Link> · <Link href="/subprocessors" target="_blank">Leverandører</Link></p>
   <label className={ui.checkbox}><input type="checkbox" checked={accept} onChange={e=>setAccept(e.target.checked)}/>Jeg har læst vilkårene og har ret til at acceptere dem på virksomhedens vegne.</label>
   <button className={styles.buttonSecondary} disabled={disabled||!accept||acceptances.some(a=>a.slug==="terms"&&a.version===TERMS.version)} onClick={()=>void action("terms",async()=>{await commerceRequest("/api/dashboard/legal",{business_id:businessId,slug:"terms",version:TERMS.version,confirmed:true});const fresh=await commerceRequest(`/api/dashboard/legal?business_id=${businessId}`);setAcceptances(fresh.acceptances);setNotice("Vilkårsaccepten er registreret med bruger, version og tidspunkt.");})}>Accepter vilkår</button>
   <p className={ui.hint}>DPA’en kan først accepteres, når en endelig version er godkendt og publiceret. Udkastet er ikke en indgået aftale.</p>
   {acceptances.length?<ul className={ui.hint}>{acceptances.map(a=><li key={`${a.slug}:${a.version}`}>{a.slug} {a.version} · {new Date(a.accepted_at).toLocaleString("da-DK")}</li>)}</ul>:<p className={ui.hint}>Ingen registrerede aftaleaccepts.</p>}
  </section>
  <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div className={ui.icon}><Search size={21}/></div><div><h2>Besøgendes dataanmodninger</h2><p>Kun din virksomheds data. Kontroller identitet via jeres eksisterende kundekanal før opslag, udlevering eller sletning.</p></div></div>
   <div className={ui.form}><label className={ui.field}>Identifikator<select value={kind} onChange={e=>{setKind(e.target.value);setValue("");resetSearch();}}><option value="email">Email</option><option value="conversation">Samtalereference</option></select></label><label className={ui.field}>{kind==="email"?"Besøgendes email":"Samtalens reference"}<input autoComplete="off" value={value} onChange={e=>{setValue(e.target.value);resetSearch();}}/></label>
    <label className={ui.checkbox}><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>Jeg har kontrolleret anmoderens identitet og ret til oplysningerne. En indtastet email eller reference er ikke i sig selv identitetsbevis.</label>
    <div className={styles.buttonRow}><button className={styles.buttonSecondary} disabled={disabled||!verified||!value} onClick={()=>void action("search",()=>visitor("search"))}>Find data</button><button className={styles.buttonSecondary} disabled={disabled||!verified||!value} onClick={()=>void action("export",()=>visitor("export"))}>Eksporter matchende data</button></div>
   </div>
   {records?<><p className={ui.hint}>{records.length} match{limited?" i forhåndsvisningen (maks. 500). Eksport og sletning behandler alle matches.":"."}</p><div className={ui.ticketList}>{records.slice(0,20).map(r=><div className={ui.connected} key={`${r.kind}:${r.id}`}><strong>{r.kind==="ticket"?"Supportsag":"Samtale"}</strong><span className={ui.hint}>{r.id}</span><span className={ui.hint}>{String(r.record.created_at||"")}</span></div>)}</div><label className={ui.checkbox}><input type="checkbox" checked={confirmDelete} onChange={e=>setConfirmDelete(e.target.checked)}/>Jeg bekræfter permanent sletning af alle matchende data og tilknyttede samtaleudsnit.</label><button className={styles.buttonDanger} disabled={disabled||!verified||!confirmDelete||records.length===0} onClick={()=>void action("delete",()=>visitor("delete"))}>Slet alle matchende data permanent</button></>:null}
   <p className={ui.hint}>Historiske samtaleudsnit uden reference, aliaser, ordredata i webshoppen og allerede sendte emails kræver særskilt gennemgang. Intet match er ikke bevis for, at der ingen personoplysninger findes.</p>
  </section>
  <section className={`${styles.card} ${ui.section}`}><h2>Din egen konto</h2><p className={ui.hint}>Eksporten omfatter konto, profil, virksomhedsdata, samtaler, beskeder, supportsager, videnskilder, aftaler og integrationsmetadata. Credentials og tokens eksporteres ikke.</p><div className={styles.buttonRow}><button className={styles.buttonSecondary} disabled={disabled} onClick={()=>void action("account-export",async()=>{const exported=await commerceRequest("/api/auth/export-data");downloadJson(exported,"embedbot-export.json");setNotice("Kontoeksporten er klargjort til download. Kontroller filen og opbevar den sikkert.");})}>Hent kontoeksport</button><Link className={styles.buttonSecondary} href="/data-requests">Andre rettigheder og kontosletning</Link></div></section>
 </div>;
}
