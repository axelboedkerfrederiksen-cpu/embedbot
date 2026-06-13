"use client";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Vilkår for Brug</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Senest opdateret: {new Date().toLocaleDateString("da-DK")}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Vilkår</h2>
            <p>
              Ved at få adgang til og bruge EmbedBot (embedbot.dk), accepterer du at være bundet af disse vilkår. Hvis du er uenig i noget af disse vilkår, bør du ikke bruge denne tjeneste.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Licens til at bruge tjenesten</h2>
            <p>
              Med forbehold for disse vilkår giver vi dig en begrænset, ikke-eksklusiv, ikke-overførbar licens til at få adgang til og bruge EmbedBot til egne forretningsformål.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Brugerkonto</h2>
            <p>
              Du er ansvarlig for at vedligeholde fortroligheden af dine loginoplysninger. Du accepterer at være fuldt ansvarlig for alle aktiviteter, der forekommer under din konto.
            </p>
            <p className="mt-4">
              <strong>Du skal:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Give sandfærdige oplysninger ved tilmelding</li>
              <li>Straks notificere os om uautoriseret adgang</li>
              <li>Ikke dele dine loginoplysninger</li>
              <li>Ikke bruge andres konti</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Forbud mod misbrug</h2>
            <p>
              Du accepterer IKKE at:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Bruge EmbedBot til ulovligt formål</li>
              <li>Manipulere eller hacke tjenesten</li>
              <li>Spamme eller misbruge chatten (spam, sexuelle eller stødende beskeder)</li>
              <li>Forsøge prompt injection for at ændre chatbot-adfærd</li>
              <li>Uploade malware eller skadelig indhold</li>
              <li>Circumvent rate limits eller sikkerhedsmechanismer</li>
              <li>Bruge tjenesten til at generere ulovligt indhold</li>
              <li>Skrabesiderne på en måde, der overtræder deres vilkår</li>
              <li>Reverse-engineer eller dekompilere tjenesten</li>
              <li>Sende spam eller phishing-forsøg via chatten</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Chat-sikkerhed og begrænseringer</h2>
            <p>
              <strong>Rate limiting:</strong> Vi begrænser chatten til 15 beskeder pr. IP per 24 timer for at forebygge misbrug.
            </p>
            <p className="mt-4">
              <strong>Prompt injection:</strong> Systemprompten er beskyttet mod manipulation. Forsøg på at få AI'en til at ignorere instruktioner vil blive filtreret.
            </p>
            <p className="mt-4">
              <strong>FAQ og kontekst:</strong> Al kontekst, der sendes til AI'en, skal være brugerdefineret af virksomhedsejeren. EmbedBot er ikke ansvarlig for urinelig eller ulovlig indhold fra virksomhedens side.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Ansvar for indhold</h2>
            <p>
              <strong>Din virksomhedsindhold:</strong> Du beholder fuld ejendomsret til de data, du uploader (FAQ, instruktioner, website-content).
            </p>
            <p className="mt-4">
              <strong>Du garanterer:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>At dit indhold ikke overtræder nogen rettigheder</li>
              <li>At dit indhold ikke er ulovligt eller stødende</li>
              <li>At du har ret til at dele indholdet på EmbedBot</li>
            </ul>
            <p className="mt-4">
              <strong>Vi er IKKE ansvarlige for:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Indhold du uploader eller dets nøjagtighed</li>
              <li>Svarene som AI'en genererer baseret på dit indhold</li>
              <li>Besøgendes beskedinger i chatten</li>
              <li>Brug af data fra dine websteder</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellektuel ejendomsret</h2>
            <p>
              EmbedBot, dets widget, design og funktionalitet er vores intellektuelle ejendom. Du må ikke kopiere, modificere eller distribuere uden tilladelse.
            </p>
            <p className="mt-4">
              <strong>Chat-svar:</strong> AI-genererede svar er arbejder oprettet af tjenesten og kan bruges frit til dine forretningsformål.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Tredjeparters tjenester</h2>
            <p>
              EmbedBot bruger:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li><strong>OpenAI:</strong> For chat-completions og embeddings (se deres vilkår)</li>
              <li><strong>Supabase:</strong> For hosting og database (se deres vilkår)</li>
              <li><strong>Resend:</strong> For email-leverance (se deres vilkår)</li>
            </ul>
            <p className="mt-4">
              Vi er ikke ansvarlige for disse tredjeparters tjenester. Se deres vilkår for mere information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Betaling og fakturering</h2>
            <p>
              [Tjekliste: Dette afsnit bør opdateres baseret på din prismodel]
            </p>
            <p className="mt-4">
              Når dette udfyldes, skal det dække:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Pricing og tilgængelige planer</li>
              <li>Billing cycle (månedlig, årlig)</li>
              <li>Refund policy</li>
              <li>What happens if payment fails</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Afslutning og suspension</h2>
            <p>
              Vi kan suspendere eller afsluttte din konto hvis:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Du overtræder disse vilkår</li>
              <li>Du bruger tjenesten til ulovligt formål</li>
              <li>Du spammer eller misbruger chatten</li>
              <li>Du forsøger at hacke tjenesten</li>
              <li>Du ikke betaler for premium-features (hvis relevant)</li>
            </ul>
            <p className="mt-4">
              <strong>Konsekvenser af suspension:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Din chatbot vil blive deaktiveret</li>
              <li>Du mister adgang til dine data (muligvis permanent)</li>
              <li>Du kan blive forment adgang til tjenesten</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Ansvarsbegrænsninger</h2>
            <p>
              <strong>SOM DER ER:</strong> EmbedBot leveres "AS IS" uden garantier af nogen art.
            </p>
            <p className="mt-4">
              <strong>VI GARANTERER IKKE:</strong>
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>At tjenesten vil være fejlfri</li>
              <li>At tjenesten vil være tilgængelig 24/7 (men vi stiler mod høj tilgængelighed)</li>
              <li>At AI-svarene altid er nøjagtige</li>
              <li>At dine data ikke vil blive mistet</li>
            </ul>
            <p className="mt-4">
              <strong>ANSVARSBEGRÆNSNING:</strong> I det maksimalt mulige omfang tilladt af lov, er vores totale ansvar for dig maksimalt det beløb, du har betalt os i de seneste 12 måneder (eller $0 hvis du ikke har betalt).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Ændringer til tjenesten</h2>
            <p>
              Vi kan ændre, suspendere eller afvikle EmbedBot (eller dele af den) til enhver tid uden forudgående varsel.
            </p>
            <p className="mt-4">
              Vi vil give mindst 30 dages varsel før vilkår ændres materielt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Indemnifikation</h2>
            <p>
              Du indemnificerer og holdes harmløs os (og vores ejere, medarbejdere, agenter) mod eventuelle krav, skader eller udgifter som skyldes:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Din brug af EmbedBot</li>
              <li>Dit indhold eller virksomhedsinformation</li>
              <li>Din krænkelse af disse vilkår</li>
              <li>Din krænkelse af andres rettigheder</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Uplinks og ændringer</h2>
            <p>
              Vi kan opdatere disse vilkår til enhver tid. Fortsatte brug af tjenesten betyder accept.
            </p>
            <p className="mt-4">
              Vi vil notificere dig om væsentlige ændringer via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Lovgivning</h2>
            <p>
              Disse vilkår skal fortolkes i overensstemmelse med dansk lov, uden hensyn til dets modstridende juridiske principper.
            </p>
            <p className="mt-4">
              Enhver tvist skal afregnes ved domstolene i Danmark.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Kontakt</h2>
            <p>
              For spørgsmål: axel@embedbot.dk
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
