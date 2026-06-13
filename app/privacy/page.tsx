"use client";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privatlivspolitik</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Senest opdateret: {new Date().toLocaleDateString("da-DK")}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduktion</h2>
            <p>
              EmbedBot ("vi", "os", "vores") drifter embedbot.dk ("Tjenesten"). Denne privatlivspolitik forklarer, hvordan vi indsamler, bruger, videregiver og beskytter dine data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data vi indsamler</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Forretningsejere</h3>
            <p>Når du opretter en konto, indsamler vi:</p>
            <ul className="list-disc list-inside mb-4">
              <li>Email-adresse</li>
              <li>Virksomhedsinformation (navn, hjemmeside, kontaktoplysninger)</li>
              <li>Chat-konfiguration (hilsen, tone, instruktioner)</li>
              <li>Branding (farver, logo, skrifttype)</li>
              <li>Åbningstider og politikker</li>
              <li>FAQ og custom instruktioner</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Chat-samtaler</h3>
            <p>Vi gemmer:</p>
            <ul className="list-disc list-inside mb-4">
              <li>Brugerbeskederm fra dine chat-besøgende</li>
              <li>AI-genererede svar</li>
              <li>Besøgendes IP-adresse (hashed til hastighedskontrol)</li>
              <li>Dato og klokkeslæt for samtale</li>
              <li>URL på siden, hvor chatten blev brugt</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Website-indhold</h3>
            <p>
              Når du konfigurerer chatten til at lære fra din hjemmeside, indsamler vi:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Tekst fra dine websider (chunked og indekseret)</li>
              <li>Vektor-embeddings genereret af OpenAI</li>
              <li>Ikke hele HTML-kilden - kun tekstindhold</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.4 Teknisk data</h3>
            <p>Vi indsamler:</p>
            <ul className="list-disc list-inside mb-4">
              <li>IP-adressen (hashed) til hastighedskontrol</li>
              <li>Cookies til authentication (httpOnly, sikker)</li>
              <li>Browser-type, browser-version, operating system</li>
              <li>Referrer-header (hvor chatten blev indlæst fra)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Hvordan vi bruger dine data</h2>
            <ul className="list-disc list-inside mb-4">
              <li><strong>Drift af tjenesten:</strong> Storeage og serving af din chatbot</li>
              <li><strong>Hastighedskontrol:</strong> Forhindring af misbrug ved hjælp af IP-hashes</li>
              <li><strong>Kundeservice:</strong> Svar på dine spørgsmål</li>
              <li><strong>Forbedring:</strong> Analyse af fejl og forbedring af tjenesten</li>
              <li><strong>Sikkerhed:</strong> Detektion og forebyggelse af svindel</li>
            </ul>
            <p>
              Vi bruger <strong>IKKE</strong> dine data til marketing, annoncer eller tredjepartsformål uden dit samtykke.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Deling af data</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Service-leverandører</h3>
            <p>Vi deler data med:</p>
            <ul className="list-disc list-inside mb-4">
              <li><strong>Supabase:</strong> Database hosting og authentication</li>
              <li><strong>OpenAI:</strong> Chat-completions og embeddings (text-embedding-3-small)</li>
              <li><strong>Resend:</strong> Email-leverance (notifikationer)</li>
              <li><strong>Vercel:</strong> Hosting og deployment (hvis relevant)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Juridiske krav</h3>
            <p>
              Vi kan videregive data hvis påkrævet af lov, retskendelse eller regeringes krav.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Ingen salg af data</h3>
            <p>
              Vi sælger ALDRIG dine data til tredjeparter.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Databehandling med OpenAI</h2>
            <p>
              Vi sender dine beskedertil OpenAI's API for at generere svar. OpenAI kan behandle dine data ifølge deres privatlivspolitik. Vi har IKKE valgt at deaktivere OpenAI's dataopbevaring.
            </p>
            <p className="mt-4">
              <strong>Hvad vi sender:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Brugerbeskeder (for at generer svar)</li>
              <li>Dit virksomhedsnavn og kontaktinformation (i systemprompten)</li>
              <li>Website-indhold du har oplyst (som kontekst)</li>
              <li>FAQ og custom instruktioner</li>
            </ul>
            <p>
              <strong>Hvad vi IKKE sender:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Brugers IP-adressen</li>
              <li>Cookies eller session-data</li>
              <li>Finansielle eller følsomme data (medmindre du har tilføjet det)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Dataopbevaring</h2>
            <p>
              <strong>Standard:</strong> Vi opbevarer dine data, så længe din konto er aktiv.
            </p>
            <p className="mt-4">
              <strong>Samtaler:</strong> Du kan vælge automatisk sletning af samtaler efter:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>30 dage</li>
              <li>90 dage (standard)</li>
              <li>180 dage</li>
              <li>Aldrig (gem alt)</li>
            </ul>
            <p className="mt-4">
              <strong>Konto-sletning:</strong> Når du sletter din konto, sletter vi:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Din virksomhedsprofil</li>
              <li>Alle samtaler</li>
              <li>Website-indhold og embeddings</li>
              <li>Dine auth-oplysninger</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies</h2>
            <p>
              Vi bruger cookies til:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li><strong>Authentication:</strong> Supabase JWT tokens (httpOnly, sikker)</li>
              <li><strong>Session:</strong> Vedligeholdelse af login status</li>
            </ul>
            <p className="mt-4">
              <strong>Vi bruger IKKE:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Analytics cookies (Google Analytics, Hotjar, osv.)</li>
              <li>Tracking cookies</li>
              <li>Annonceringscookies</li>
            </ul>
            <p className="mt-4">
              Du kan kontrollere cookies i dine browser-indstillinger.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Dine rettigheder (GDPR)</h2>
            <p>
              Du har ret til:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li><strong>Adgang:</strong> Anmod om kopi af dine data</li>
              <li><strong>Berettigung:</strong> Ændring af urigtige data</li>
              <li><strong>Sletning:</strong> "Retten til at blive glemt"</li>
              <li><strong>Indskrænkning:</strong> Begrænsning af behandling</li>
              <li><strong>Overførbarhed:</strong> Modtagelse af dine data i struktureret format</li>
              <li><strong>Indsigelse:</strong> Indsigelse mod behandling</li>
            </ul>
            <p className="mt-4">
              For at udøve disse rettigheder, kontakt: axel@embedbot.dk
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Sikkerhed</h2>
            <p>
              Vi implementerer:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>HTTPS for all komunikation (TLS 1.2+)</li>
              <li>Encryption i transit og i rest (Supabase)</li>
              <li>IP-hashing i stedet for raw IP-lagring</li>
              <li>HttpOnly cookies for authentication</li>
              <li>Timing-safe token comparison for admin-access</li>
            </ul>
            <p className="mt-4">
              <strong>Vi garanterer IKKE 100% sikkerhed.</strong> Ingen online tjeneste er absolut sikker.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Internationale overførsler</h2>
            <p>
              Dine data kan blive overført til:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li><strong>USA:</strong> Supabase, OpenAI, Vercel</li>
              <li><strong>EU/EEA:</strong> Resend</li>
            </ul>
            <p className="mt-4">
              Disse virksomheder har data protection agreements for overførsler.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Ændringer til denne politikk</h2>
            <p>
              Vi kan opdatere denne politikk når som helst. Vigtige ændringer vil blive kommunikeret via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Kontakt</h2>
            <p>
              For spørgsmål om privatlivspolitikken:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> axel@embedbot.dk<br />
              <strong>Adresse:</strong> [Din adresse]<br />
              <strong>Tlf.:</strong> [Dit telefonnummer]
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Datatilsynet</h2>
            <p>
              Hvis du har bekymringer, kan du også klage til Datatilsynet: datatilsynet.dk
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
