import Link from "next/link";
import { SUPPLIERS } from "@/lib/compliance/suppliers";

export const metadata = { title: "Leverandører og underdatabehandlere — EmbedBot" };

export default function Page() {
 return <main id="main-content" className="min-h-screen bg-[var(--bg-page)] px-4 py-12 text-gray-900 sm:px-6 lg:px-8"><article className="privacy-policy mx-auto max-w-4xl">
  <Link href="/">← Tilbage til EmbedBot</Link>
  <h1>Leverandører og underdatabehandlere</h1>
  <p>Senest opdateret: <time dateTime="2026-10-03">3. oktober 2026</time>.</p>
  <p>Oversigten beskriver de tjenester, EmbedBot bruger, deres opgaver og leverandørernes offentliggjorte aftalevilkår. Rollen afhænger af, om oplysningerne behandles for webshopkunden eller til EmbedBots egen konto-, betalings- og websiteadministration. En dansk eller europæisk aftalepart betyder ikke nødvendigvis, at al behandling sker i EU.</p>
  <div className="my-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5" role="note"><strong>Hosting og kundeaccept</strong><p>EmbedBot bruger aktuelt Vercel Hobby. Vercels offentlige databehandleraftale omfatter Pro og Enterprise. Kundeaccept af EmbedBots DPA er derfor lukket, indtil hostingens kommercielle aftale- og databehandlerdækning samt de konkrete overførselsbilag er på plads.</p></div>
  {SUPPLIERS.map(s=><section key={s.provider} className="my-6 rounded-lg border border-[var(--border)] p-5"><h2>{s.provider}</h2>
   <dl className="grid gap-3 sm:grid-cols-[190px_1fr]">{Object.entries({"Juridisk enhed":s.legalName,"Service":s.service,"Formål":s.purpose,"Oplysninger":s.data,"Behandlingssted":s.location,"Rolle":s.role,"Overførselsgrundlag":s.transfer,"Omfattet behandling":s.scope,"Senest gennemgået":"3. oktober 2026"}).map(([label,value])=><div key={label} className="contents"><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>
   <p className="mt-4 text-sm text-[var(--text-muted)]">{s.evidence}</p>
   <ul>{s.sources.map(([label,url])=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label}</a></li>)}</ul>
  </section>)}
  <p>Shopify og WooCommerce er valgfrie forbindelser til kundens egne systemer. Kundens webshop, host, supportindbakke og egne downloads er kundevalgte datakilder og modtagere. Widgetten indlæser ikke Google Fonts.</p>
  <p>Ændringer af de underdatabehandlere, der omfattes af en kundes aftale, håndteres efter databehandleraftalens varslings- og indsigelsesprocedure. Oversigtens kontroltidspunkt er ikke leverandørens tilføjelsesdato.</p>
  <nav className="flex flex-wrap gap-4"><Link href="/privacy">Privatliv</Link><Link href="/dpa">Databehandleraftale</Link><Link href="/terms">Vilkår</Link></nav>
 </article></main>;
}
