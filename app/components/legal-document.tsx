import Link from "next/link";
import type { TERMS } from "@/lib/compliance/legal";
export default function LegalDocument({document}:{document:typeof TERMS}) {
 return <main id="main-content" className="min-h-screen bg-[var(--bg-page)] px-4 py-12 text-gray-900 sm:px-6 lg:px-8"><article className="privacy-policy mx-auto max-w-4xl">
  <Link href="/">← Tilbage til EmbedBot</Link><h1>{document.title}</h1><p>Version {document.version}</p>
  <div className="my-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5" role="note">{document.notice}</div>
  {document.sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
  <nav className="flex flex-wrap gap-4"><Link href="/prices">Priser</Link><Link href="/refunds">Betaling og refundering</Link><Link href="/privacy">Privatliv</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Vilkår</Link><Link href="/dpa">Databehandleraftale</Link><Link href="/subprocessors">Leverandører</Link></nav>
 </article></main>;
}
