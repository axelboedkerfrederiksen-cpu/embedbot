"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">EmbedBot</h3>
            <p className="text-gray-300 text-sm">
              Intelligent chatbot for e-handlere
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Produkt</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-gray-300 hover:text-white">Features</Link></li>
              <li><Link href="/support" className="text-gray-300 hover:text-white">Support</Link></li>
              <li><Link href="/prices" className="text-gray-300 hover:text-white">Priser</Link></li>
              <li><Link href="/setup" className="text-gray-300 hover:text-white">Kom i gang</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-300 hover:text-white">Privatlivspolitik</Link></li>
              <li><Link href="/terms" className="text-gray-300 hover:text-white">Vilkår for brug</Link></li><li><Link href="/dpa" className="text-gray-300 hover:text-white">DPA (udkast)</Link></li><li><Link href="/subprocessors" className="text-gray-300 hover:text-white">Leverandører</Link></li>
              <li><a href="mailto:axel@embedbot.dk" className="text-gray-300 hover:text-white">Kontakt</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Juridisk</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-300 hover:text-white">Datapolitik</Link></li>
              <li><Link href="/cookies" className="text-gray-300 hover:text-white">Cookiepolitik</Link></li>
              <li><Link href="/refunds" className="text-gray-300 hover:text-white">Betaling og refundering</Link></li>
              <li><Link href="/data-requests" className="text-gray-300 hover:text-white">Dataanmodning</Link></li>
              <li><Link href="/terms" className="text-gray-300 hover:text-white">Vilkår</Link></li>
              <li><a href="https://datatilsynet.dk" className="text-gray-300 hover:text-white">Datatilsynet</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} EmbedBot. Alle rettigheder forbeholdt.
              <br />Axel Bødker Frederiksen · +45 91 55 12 50
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                Privatlivspolitik
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
