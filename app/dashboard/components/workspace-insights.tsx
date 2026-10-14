"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, BookOpenText, Check, Download, FlaskConical, Gauge, Inbox, Radio, TriangleAlert } from "lucide-react";
import { analyticsCsv, analyticsText, workspaceAnalytics, type AnalyticsPeriod } from "@/lib/workspace/analytics";
import type { Workspace } from "@/lib/workspace/model";
import s from "./workspace-insights.module.css";

type Destination = "gaps"|"insights"|"sources"|"testing"|"tickets"|"leads"|"installation";
type Props = {state:Workspace;mode?:"overview"|"digest"|"technical";demo?:boolean;aiConfigured:boolean;mailReady:boolean;onNavigate:(view:Destination,recordId?:string)=>void};
const number = (n:number) => n.toLocaleString("da-DK");
const rate = (n:number|null) => n===null?"—":`${n.toLocaleString("da-DK",{maximumFractionDigits:1})}%`;
const time = (date?:string) => date?new Date(date).toLocaleString("da-DK",{timeZone:"Europe/Copenhagen",dateStyle:"short",timeStyle:"short"}):"Ikke registreret";
const duration = (ms:number|null) => ms===null?"—":`${(ms/1000).toLocaleString("da-DK",{maximumFractionDigits:2})} s`;
const age = (hours:number|null) => hours===null?"—":hours<1?"Under 1 time":hours<48?`${Math.floor(hours)} timer`:`${Math.floor(hours/24)} dage`;
function download(text:string,name:string,type:string) {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const link=document.createElement("a");link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Stat({label,value,detail,subtle=false}:{label:string;value:string;detail:string;subtle?:boolean}) {
  return <article className={`${s.stat} ${subtle?s.subtle:""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
export default function WorkspaceInsights({state,mode="overview",demo=false,aiConfigured,mailReady,onNavigate}:Props) {
  const [period,setPeriod]=useState<AnalyticsPeriod>(7);
  const [day,setDay]=useState("");
  const [localAsOf]=useState(()=>new Date().toISOString());
  const asOf=useMemo(()=>new Date(state.dataScope?.readAt||localAsOf),[state.dataScope?.readAt,localAsOf]);
  const report=useMemo(()=>workspaceAnalytics(state,mode==="digest"?7:period,asOf),[state,period,mode,asOf]);
  const current=report.current;
  const selected=report.daily.find(d=>d.date===day);
  const max=Math.max(1,...report.daily.map(d=>d.questions));
  const scope=report.coverage;
  const change=report.previous.questions===0?"Ingen aktivitet i foregående periode":`${report.change.absolute>0?"+":""}${number(report.change.absolute)} spørgsmål · ${report.change.percent!>0?"+":""}${rate(report.change.percent)} mod foregående periode`;
  const coverageLabel=scope.complete?"Hele perioden dækket":"Begrænset dataudsnit";
  const exportReport=()=>download(analyticsText(report,state.name),"embedbot-opsummering.txt","text/plain;charset=utf-8");

  return <div className={s.report}>
    <section className={s.intro}>
      <div><span className={s.eyebrow}>{mode==="technical"?"DRIFT & DATAGRUNDLAG":mode==="digest"?"UGEN I TAL":"FRA SPØRGSMÅL TIL INDSIGT"}</span><h2>{mode==="technical"?"Se, hvad der faktisk er målt.":mode==="digest"?"Et præcist blik på den sidste uge.":"Din chatbot. Med tallene bag."}</h2><p>{mode==="technical"?"Svartider, tests og datadækning samlet ét sted.":"Se udviklingen, find de næste forbedringer og følg op dér, hvor det tæller."}</p></div>
      <div className={s.tools}>{mode!=="digest"?<div className={s.period} role="group" aria-label="Analyseperiode">{([7,30] as const).map(days=><button key={days} type="button" aria-pressed={period===days} onClick={()=>{setPeriod(days);setDay("");}}>{days} dage</button>)}</div>:null}<button type="button" className={s.button} onClick={exportReport}><Download size={14}/>Rapport</button></div>
    </section>
    <div className={s.context}><span><Radio size={12}/>{demo?"Eksempeldata · lokal demo":"Dine gemte kundedata"}</span><span>{time(report.from)} — {time(report.to)} · dansk tid</span></div>
    {!scope.complete||!scope.comparisonComplete?<div className={s.notice} role="status"><TriangleAlert size={15}/><div><strong>{coverageLabel}</strong><span>Viser {number(scope.loaded)} af {number(scope.total)} gemte poster. {scope.complete?"Den aktuelle periode er dækket, men sammenligningen kan være ufuldstændig.":"Periode- og sammenligningstal er fra det indlæste udsnit."}</span></div></div>:null}
    {mode==="technical"?<>
      <div className={s.stats}>
        <Stat label="AI-svartid · P50" value={duration(current.p50)} detail={`${number(current.timedAnswers)} færdige svar med måling`}/>
        <Stat label="AI-svartid · P95" value={duration(current.p95)} detail="95% af de målte, færdige svar er højst denne tid"/>
        <Stat label="Registrerede streamfejl" value={rate(current.interruptedRate)} detail={`${current.interrupted} af ${current.streams} streams med kendt status`} subtle={current.interrupted>0}/>
        <Stat label="Aktuelle testmatch" value={`${report.tests.passed} / ${report.tests.withCriteria}`} detail={`${report.tests.failed} matcher ikke · ${report.tests.unrun} ikke kørt · ${report.tests.stale} forældede`}/>
      </div>
      <div className={s.grid}>
        <section className={s.card}><div className={s.title}><Gauge size={17}/><h3>Driftssignaler</h3></div>
          <div className={s.row}><div><strong>Seneste widget-indlæsning</strong><small>{time(report.installation.lastSeenAt)}{report.installation.page?` · ${report.installation.page}`:""}</small></div><span className={s.pill}>{age(report.installation.ageHours)} siden</span></div>
          <div className={s.row}><div><strong>AI-konfiguration</strong><small>Konfiguration er ikke en kontrol af providerens tilgængelighed.</small></div><span className={s.pill}>{aiConfigured?"Konfigureret":"Mangler"}</span></div>
          <div className={s.row}><div><strong>Mailafsendelse</strong><small>{report.queue.pendingReplies} afventer · {report.queue.failedReplies} fejlede svar</small></div><span className={s.pill}>{demo?"Deaktiveret i demo":mailReady?"Konfigureret":"Mangler"}</span></div>
          <p className={s.footnote}>Widget-signalet er en registreret indlæsning, ikke en oppetidsmåling. Streamfejl tæller kun gemte svar med måledata.</p>
          <button className={s.link} type="button" onClick={()=>onNavigate("installation")}>Gennemgå installationen<ArrowRight size={13}/></button>
        </section>
        <section className={s.card}><div className={s.title}><FlaskConical size={17}/><h3>Viden & regressionstests</h3></div>
          <div className={s.row}><span>Godkendte kilder</span><strong>{report.sources.total}</strong></div>
          <div className={s.row}><span>Kildeændringer venter på godkendelse</span><strong>{report.sources.pending}</strong></div>
          <div className={s.row}><span>Afkortede kilder / kildefejl</span><strong>{report.sources.truncated} / {report.sources.errors}</strong></div>
          <div className={s.row}><div><strong>Tests før seneste kildeændring</strong><small>Kør disse tests igen, før du stoler på resultatet.</small></div><strong>{report.tests.stale}</strong></div>
          <p className={s.footnote}>{report.tests.total-report.tests.withCriteria} tests har ingen forventet tekst og indgår ikke i beståede tests. Tekstmatch dokumenterer ikke hele svarets kvalitet.</p>
          <button className={s.link} type="button" onClick={()=>onNavigate("testing")}>Kør dine tests<ArrowRight size={13}/></button>
        </section>
      </div>
    </>:<>
      <div className={s.stats}>
        <Stat label={`Spørgsmål · ${report.days} dage`} value={number(current.questions)} detail={`${scope.comparisonComplete?"":"Udsnit · "}${change}`}/>
        <Stat label="Positiv kundefeedback" value={rate(current.helpfulRate)} detail={`${current.helpful} af ${current.feedback} tilbagemeldinger · ${rate(current.feedbackRate)} af posterne har feedback`}/>
        <Stat label="Leads oprettet i perioden" value={number(current.newLeads)} detail={`${report.coverage.leadsComplete?"Alle indlæste leads i perioden":"Udsnit af perioden"} · ${report.queue.openLeads} afventer kontakt nu`}/>
        <Stat label="Åbne supportsager nu" value={number(report.queue.openTickets)} detail={`Ældste åbne sag: ${age(report.queue.oldestHours)}`} subtle={report.queue.openTickets>0}/>
      </div>
      <div className={s.chartGrid}>
        <section className={s.card}><div className={s.cardHeader}><div className={s.title}><Activity size={17}/><h3>Spørgsmål over tid</h3></div><span className={s.pill}>{coverageLabel}</span></div><p className={s.description}>Klik på en dag for at se antal og feedback. Første og sidste dag kan være delvise.</p>
          <div className={s.chart} aria-label="Daglige registrerede spørgsmål">{report.daily.map(d=><button type="button" key={d.date} aria-pressed={day===d.date} aria-label={`${d.date}: ${d.questions} spørgsmål, ${d.feedback} tilbagemeldinger`} className={s.day} onClick={()=>setDay(d.date)}><span className={s.barArea}><span className={s.bar} style={{height:`${d.questions?Math.max(4,d.questions/max*100):0}%`}}/><span className={s.barNumber}>{d.questions}</span></span><span className={s.dayLabel}>{d.date.slice(8)}.{d.date.slice(5,7)}</span></button>)}</div>
          <div className={s.chartDetail} aria-live="polite">{selected?<><strong>{selected.date}</strong><span>{selected.questions} spørgsmål · {selected.feedback} tilbagemeldinger · {selected.negative} negative · {selected.gapSignals} signaler om videnshul</span></>:<><strong>{number(current.questions)} spørgsmål</strong><span>{current.answered} med gemt svar · {current.gapSignals} med signal om manglende hjælp</span></>}</div>
        </section>
        <section className={s.card}><div className={s.title}><Inbox size={17}/><h3>Det kræver opfølgning</h3></div><div className={s.queueTotal}><strong>{number(report.queue.openTickets)}</strong><span>åbne supportsager<br/>{report.queue.openLeads} leads afventer kontakt.</span></div>
          {report.queue.tickets.length?<div>{report.queue.tickets.map(t=><button className={s.queueItem} type="button" key={t.id} onClick={()=>onNavigate("tickets",t.id)}><span><strong>EB-{t.number}</strong><small>{t.status==="new"?"Ny sag":"Under behandling"}</small></span><span>{age(t.ageHours)}<ArrowUpRight size={13}/></span></button>)}</div>:<p className={s.description}>Ingen åbne supportsager i det indlæste udsnit.</p>}
          <div className={s.queueActions}><button type="button" className={s.link} onClick={()=>onNavigate("tickets")}>Supportsager<ArrowRight size={13}/></button><button type="button" className={s.link} onClick={()=>onNavigate("leads")}>Leads<ArrowRight size={13}/></button></div>
          {report.queue.failedReplies>0?<p className={s.warning}>{report.queue.failedReplies} svar kunne ikke sendes. Gennemgå sagernes historik.</p>:null}
        </section>
      </div>
      <div className={s.grid}>
        <section className={s.card}><div className={s.title}><BookOpenText size={17}/><h3>De næste forbedringer</h3></div><p className={s.description}>Forslagene bygger på spørgsmål, svar og feedback i den valgte periode.</p>{report.opportunities.length?report.opportunities.map(g=><button key={g.id} type="button" className={s.opportunity} onClick={()=>onNavigate(g.missing?"gaps":"insights")}><span className={s.opportunityCount}>{g.count}</span><span><strong>{g.title}</strong><small>{g.suggestion}</small></span><ArrowRight size={14}/></button>):<div className={s.empty}><Check size={20}/><p>Ingen forslag i denne periode. Nye spørgsmål giver et bedre grundlag.</p></div>}<p className={s.footnote}>Videnshuller er regelbaserede signaler. Gennemgå samtaleeksemplerne, før du ændrer indholdet.</p></section>
        <section className={s.card}><div className={s.title}><ArrowUpRight size={17}/><h3>Hvor spørgsmålene kommer fra</h3></div><p className={s.description}>Sideadresse uden query-parametre. Manglende adresse vises særskilt.</p>{report.pages.length?<div className={s.pages}>{report.pages.map(p=><div key={p.path} className={s.page}><div><code>{p.path}</code><strong>{number(p.questions)}</strong></div><div className={s.pageTrack}><span style={{width:`${p.questions/Math.max(1,current.questions)*100}%`}}/></div><small>{p.gapSignals} signaler om videnshul</small></div>)}</div>:<div className={s.empty}><p>Sideindsigter kommer, når kunderne stiller spørgsmål.</p></div>}</section>
      </div>
    </>}
    <details className={s.method} open={mode==="technical"}>
      <summary>Datagrundlag & præcise definitioner <span>{number(scope.loaded)} / {number(scope.total)} poster</span></summary>
      <div className={s.methodGrid}><div><h3>Et overblik, du kan efterprøve</h3><dl><dt>Opdateret</dt><dd>{time(report.to)}</dd><dt>Spørgsmål</dt><dd>Alle gemte brugerbeskeder i perioden; én post kan rumme flere beskeder. Historiske samlede poster bruger postens oprettelsestid. Ikke unikke kunder eller sessioner.</dd><dt>Feedback</dt><dd>Én stemme pr. gemt post. Kun feedback på poster oprettet i perioden. {scope.feedbackComplete?"Alle feedbackposter indlæst.":"Feedbacklisten er et udsnit."} Frivillig stikprøve, ikke en løsningsrate.</dd><dt>Perioder</dt><dd>Rullende {report.days} × 24 timer, med start inklusiv og slut eksklusiv. Sammenligning med de {report.days} dage umiddelbart før. Dagstal vises i Europe/Copenhagen.</dd><dt>Leads / sager</dt><dd>Oprettede i perioden tælles uanset nuværende status. Åbne sager og leads afventer er status lige nu.</dd></dl></div>
      <div><h3>Måledækning</h3><dl><dt>Spørgsmålsperiode</dt><dd>{scope.complete?"Dækket":"Udsnit"} · sammenligning: {scope.comparisonComplete?"dækket":"udsnit"}</dd><dt>Indlæste poster</dt><dd>{scope.loaded} af {scope.total} · {scope.excluded} uden brugbart spørgsmål · {scope.invalidDates} uden gyldig dato</dd><dt>Leads / supportsager</dt><dd>{report.coverage.leadsComplete?"Hele perioden":"Udsnit"} / {report.coverage.ticketsComplete?"hele perioden":"udsnit"}</dd><dt>AI-svartid</dt><dd>Kun færdige svar: fra AI-kald til afsluttet streaming på serveren. {current.timedAnswers} målte svar; ældre svar uden måling er udeladt. P50/P95 bruger nærmeste rang. Ikke kundens netværkstid.</dd><dt>Streamfejl</dt><dd>{current.streams} svar med registreret status. Afviste forespørgsler og fejl før streaming tælles ikke her. Kilden opdateres ved nye svar.</dd></dl></div></div>
      <div className={s.exports}><button className={s.button} type="button" onClick={()=>download(analyticsCsv(report),"embedbot-dagstal.csv","text/csv;charset=utf-8")}><Download size={13}/>Dagstal som CSV</button><button className={s.button} type="button" onClick={()=>download(JSON.stringify({from:report.from,to:report.to,days:report.days,current:report.current,previous:report.previous,coverage:report.coverage,daily:report.daily,pages:report.pages},null,2),"embedbot-analyse.json","application/json")}><Download size={13}/>Måledata som JSON</button></div>
    </details>
  </div>;
}
