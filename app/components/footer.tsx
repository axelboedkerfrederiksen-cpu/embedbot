"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[var(--bg-page)] text-[var(--text-primary)] border-t border-[var(--border)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-medium mb-4">EmbedBot</h3>
            <p className="text-[var(--text-muted)] text-sm">
              Intelligent chatbot for e-handlere
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-4">Produkt</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Features</Link></li>
              <li><Link href="/support" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Support</Link></li>
              <li><Link href="/prices" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Priser</Link></li>
              <li><Link href="/setup" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Kom i gang</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Privatlivspolitik</Link></li>
              <li><Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Vilkår for brug</Link></li><li><Link href="/dpa" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Databehandleraftale</Link></li><li><Link href="/subprocessors" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Leverandører</Link></li>
              <li><a href="mailto:axel@embedbot.dk" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Kontakt</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Juridisk</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Datapolitik</Link></li>
              <li><Link href="/cookies" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cookiepolitik</Link></li>
              <li><Link href="/refunds" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Betaling og refundering</Link></li>
              <li><Link href="/data-requests" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Dataanmodning</Link></li>
              <li><Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Vilkår</Link></li>
              <li><a href="https://datatilsynet.dk" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Datatilsynet</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-[var(--text-subtle)] text-sm">
              © {new Date().getFullYear()} EmbedBot. Alle rettigheder forbeholdt.
              <br />Axel Bødker Frederiksen · +45 91 55 12 50
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-sm">
                Privatlivspolitik
              </Link>
              <Link href="/terms" className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-sm">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
