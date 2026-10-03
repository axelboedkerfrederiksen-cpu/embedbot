import Link from "next/link";
import type { LEGAL_DOCUMENTS } from "@/lib/compliance/legal";
export default function LegalDocument({document}:{document:(typeof LEGAL_DOCUMENTS)[number]}) {
 return <main id="main-content" className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8"><article className="privacy-policy mx-auto max-w-4xl">
  <Link href="/">← Tilbage til EmbedBot</Link><h1>{document.title}</h1><p>Version {document.version}</p>
  <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-5" role="note">{document.notice}</div>
  {document.sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
  {document.slug==="dpa"?<section><h2>Leverandører i den verificerede implementation</h2><p>{document.suppliers.map(s=>s.provider).join(", ")}. Denne leverandørsnapshot er en del af dokumentversionen. Juridisk enhed, rolle og overførsel: Requires verification. De kontraktlige forhold er ikke godkendt af denne liste.</p></section>:null}
  <nav className="flex flex-wrap gap-4"><Link href="/prices">Priser</Link><Link href="/refunds">Betaling og refundering</Link><Link href="/privacy">Privatliv</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Vilkår</Link><Link href="/dpa">DPA (udkast)</Link><Link href="/subprocessors">Leverandører</Link></nav>
 </article></main>;
}
