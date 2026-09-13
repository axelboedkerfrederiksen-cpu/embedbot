import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8">
      <article className="prose prose-lg mx-auto max-w-4xl prose-headings:text-gray-900 prose-a:text-blue-700">
        <div className="mb-10 not-prose">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← Tilbage til EmbedBot
          </Link>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900">
            Privatlivspolitik
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Senest opdateret: <time dateTime="2026-09-13">13. september 2026</time>
          </p>
        </div>

        <p>
          Denne privatlivspolitik forklarer, hvordan EmbedBot indsamler, bruger,
          deler og beskytter personoplysninger, når du bruger EmbedBot eller
          besøger embedbot.dk. Vi forsøger at indsamle så få oplysninger som
          muligt og bruger kun oplysningerne til tydelige formål.
        </p>

        <div className="not-prose my-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <p className="font-semibold">Hvis du bruger EmbedBot på vegne af en virksomhed</p>
          <p className="mt-2 text-sm leading-6">
            Virksomheden er normalt ansvarlig for de personoplysninger, som dens
            besøgende skriver i chatbotten. EmbedBot behandler i så fald disse
            oplysninger efter virksomhedens instruktioner. Virksomheden skal
            derfor selv sørge for relevant information til sine besøgende og et
            lovligt behandlingsgrundlag. Kontakt os, hvis der er behov for en
            databehandleraftale.
          </p>
        </div>

        <section>
          <h2>1. Hvem er dataansvarlig?</h2>
          <p>
            Den dataansvarlige for EmbedBots egen konto-, betalings-, support- og
            sikkerhedsbehandling er:
          </p>
          <address className="not-italic">
            <strong>EmbedBot / Axel Bødker Frederiksen</strong>
            <br />
            Smallegade 42, 4. tv.
            <br />
            Telefon: <a href="tel:+4591551250">+45 91 55 12 50</a>
            <br />
            E-mail: <a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a>
          </address>
        </section>

        <section>
          <h2>2. Hvilke oplysninger indsamler vi?</h2>

          <h3>2.1 Konto og opsætning</h3>
          <p>Afhængigt af hvad du udfylder, kan vi behandle:</p>
          <ul>
            <li>navn på virksomhed, hjemmeside og kontaktoplysninger</li>
            <li>e-mailadresse og oplysninger, der er nødvendige for login</li>
            <li>chatbot-opsætning, hilsen, tone, sprog og instruktioner</li>
            <li>logo, farver, skrifttype, åbningstider og virksomhedspolitikker</li>
            <li>FAQ, produktinformation og andet indhold, du selv tilføjer</li>
            <li>abonnement, valgt plan og tekniske konto-id&apos;er.</li>
          </ul>

          <h3>2.2 Chatbeskeder</h3>
          <p>
            Når en besøgende bruger en EmbedBot-chatbot, kan vi behandle
            brugerens beskeder, chatbotens svar, tidspunkt, den relevante
            virksomheds konto, den side hvor chatten blev åbnet, og den tidligere
            samtalehistorik, der er nødvendig for at svare sammenhængende.
          </p>

          <h3>2.3 Website- og vidensindhold</h3>
          <p>
            Hvis en virksomhed beder EmbedBot om at lære fra en hjemmeside, kan vi
            hente og gemme tekst fra de relevante sider. Teksten opdeles i mindre
            dele og kan omdannes til søgevektorer (embeddings), så chatbotten kan
            finde relevant information. Indholdet behandles kun for at levere den
            opsatte chatbot og relaterede funktioner.
          </p>

          <h3>2.4 Supporthenvendelser</h3>
          <p>
            Hvis du kontakter support, kan vi behandle navn, e-mail,
            virksomhedsnavn, henvendelsestype, besked og tidspunkt for henvendelsen.
          </p>

          <h3>2.5 Betaling og abonnement</h3>
          <p>
            Betaling sker via Stripe&apos;s hostede betalingsside. Stripe håndterer
            betalings- og kortoplysninger på betalingssiden. EmbedBot modtager
            normalt kun de oplysninger, der er nødvendige for at administrere
            abonnementet, f.eks. betalingsstatus, valgt plan, Stripe-kunde- og
            abonnements-id, periode og e-mailadresse. EmbedBot er ikke designet til
            at modtage eller gemme dit fulde kortnummer.
          </p>

          <h3>2.6 Tekniske oplysninger og sikkerhed</h3>
          <p>Vi kan behandle tekniske oplysninger som:</p>
          <ul>
            <li>IP-adresse eller en hash af IP-adressen til rate limiting og misbrugsforebyggelse</li>
            <li>browser, operativsystem, enhedstype, referrer og tekniske headers</li>
            <li>side-URL, tidspunkt, fejl, statuskoder og andre driftslogs</li>
            <li>oplysninger om netværk og ydeevne i forbindelse med Speed Insights.</li>
          </ul>

          <h3>2.7 Analyse og ydeevne</h3>
          <p>
            Den nuværende version bruger Plausible Analytics, Vercel Web Analytics
            og Vercel Speed Insights til at forstå brug af sitet og følge teknisk
            ydeevne. Vercel beskriver Web Analytics og Speed Insights som
            anonymiserede målinger, der blandt andet kan omfatte side/route,
            referrer, browser, enhed, land, tidspunkt og web vitals. Vi bruger ikke
            Google Analytics, Hotjar eller annoncecookies i den nuværende version.
          </p>
        </section>

        <section>
          <h2>3. Hvorfor bruger vi oplysningerne?</h2>
          <p>Vi bruger oplysningerne til følgende formål:</p>
          <ul>
            <li>at oprette og administrere konti, abonnementer og chatbotter</li>
            <li>at levere chatbot-svar, søgning i virksomhedens indhold og support</li>
            <li>at håndtere betalinger, abonnementer, kvitteringer og bogføring</li>
            <li>at begrænse misbrug, spam, automatiserede angreb og overbelastning</li>
            <li>at fejlfinde, sikre og forbedre EmbedBot</li>
            <li>at måle brug, konvertering og ydeevne på en aggregeret måde</li>
            <li>at overholde lovkrav, håndtere tvister og gøre juridiske krav gældende.</li>
          </ul>
          <p>
            Vi sælger ikke personoplysninger. Vi bruger ikke indhold fra dine
            chatbot-samtaler eller din konto til annoncering. Hvis vi senere
            indfører ikke-nødvendig markedsføring eller tracking, opdaterer vi
            politikken og indhenter samtykke, hvor det kræves.
          </p>
        </section>

        <section>
          <h2>4. Behandlingsgrundlag</h2>
          <p>
            Vi behandler normalt personoplysninger på disse grundlag efter GDPR:
          </p>
          <ul>
            <li>
              <strong>Opfyldelse af aftale (artikel 6, stk. 1, litra b):</strong>{" "}
              konto, chatbot, support og abonnement.
            </li>
            <li>
              <strong>Retlig forpligtelse (artikel 6, stk. 1, litra c):</strong>{" "}
              bogføring, betaling og andre lovkrav.
            </li>
            <li>
              <strong>Legitim interesse (artikel 6, stk. 1, litra f):</strong>{" "}
              sikkerhed, rate limiting, fejlretning, misbrugsforebyggelse og
              begrænset produktforbedring, hvor vores interesse ikke overstiger
              dine rettigheder.
            </li>
            <li>
              <strong>Samtykke (artikel 6, stk. 1, litra a):</strong> kun hvor
              samtykke er nødvendigt, eksempelvis for bestemte ikke-nødvendige
              cookies eller fremtidig markedsføring.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Hvem deler vi oplysninger med?</h2>
          <p>
            Vi bruger databehandlere og andre leverandører, når det er nødvendigt
            for at levere tjenesten. De får kun adgang til de oplysninger, der er
            relevante for deres opgave, og vi indgår relevante aftaler, hvor det
            kræves.
          </p>
          <ul>
            <li>
              <strong>Supabase:</strong> database, login, sessioner og opbevaring. Se{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                Supabase&apos;s privatlivspolitik
              </a>.
            </li>
            <li>
              <strong>OpenAI:</strong> generering af chatbot-svar og embeddings. Se{" "}
              <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer">
                OpenAI&apos;s privatlivspolitik
              </a>.
            </li>
            <li>
              <strong>Stripe:</strong> betaling, abonnement, fakturering, risikokontrol
              og relateret betalingsadministration. Se{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
                Stripe&apos;s privatlivspolitik
              </a>.
            </li>
            <li>
              <strong>Resend:</strong> udsendelse af drifts-, support- og
              transaktionsrelaterede e-mails. Se{" "}
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                Resend&apos;s privatlivspolitik
              </a>.
            </li>
            <li>
              <strong>Vercel:</strong> hosting, deployment, tekniske logs, Web
              Analytics og Speed Insights. Se{" "}
              <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">
                Vercel&apos;s privatlivsmeddelelse
              </a>.
            </li>
            <li>
              <strong>Plausible:</strong> analyse af brugen af embedbot.dk. Se{" "}
              <a href="https://plausible.io/data-policy" target="_blank" rel="noreferrer">
                Plausible&apos;s databeskrivelse
              </a>.
            </li>
          </ul>
          <p>
            Leverandørlisten kan ændre sig, hvis infrastrukturen eller funktionerne
            ændres. Den aktuelle version af denne politik viser de væsentlige
            leverandører, der anvendes på tidspunktet for opdateringen.
          </p>
        </section>

        <section>
          <h2>6. Særligt om OpenAI</h2>
          <p>
            For at generere et svar kan vi sende brugerens besked samt relevant
            virksomhedsinformation, FAQ, website-indhold og nødvendig
            samtalehistorik til OpenAI via API. Vi sender ikke IP-adresse, cookies
            eller Stripe-kortoplysninger som en del af chatbot-prompten. Hvis en
            virksomhed selv indtaster personfølsomme eller andre følsomme data i
            sit indhold, kan sådanne data dog blive sendt som relevant kontekst.
          </p>
          <p>
            OpenAI oplyser, at data fra API-tjenester som udgangspunkt ikke bruges
            til træning af modeller, medmindre kunden aktivt vælger at dele data.
            OpenAI oplyser samtidig, at abuse-monitoring logs som udgangspunkt kan
            opbevares i op til 30 dage, med forbehold for særlige indstillinger,
            endpoint-typer, lovkrav og sikkerhedshensyn. Se den aktuelle{" "}
            <a
              href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint"
              target="_blank"
              rel="noreferrer"
            >
              OpenAI API-dokumentation om dataopbevaring
            </a>.
          </p>
        </section>

        <section>
          <h2>7. Særligt om Stripe</h2>
          <p>
            Når du starter et betalt abonnement, bliver du sendt til Stripe, som
            leverer betalingsvinduet. Stripe kan behandle betalingsoplysninger,
            faktureringsoplysninger, enhed-/transaktionsoplysninger og oplysninger
            til forebyggelse af svindel. EmbedBot modtager de nødvendige
            abonnementsoplysninger fra Stripe, så vi kan aktivere, administrere og
            eventuelt stoppe din plan.
          </p>
          <p>
            Stripe kan også behandle visse oplysninger som selvstændig
            dataansvarlig for egne juridiske, sikkerheds- og
            svindelforebyggende formål. Stripes egne vilkår og privatlivspolitik
            gælder derfor også for betalingssiden.
          </p>
        </section>

        <section>
          <h2>8. Internationale overførsler</h2>
          <p>
            Nogle leverandører kan behandle personoplysninger uden for EU/EØS.
            Hvis det sker, anvender vi de overførselsmekanismer, der er relevante
            for den konkrete leverandør og behandling, f.eks. en
            tilstrækkelighedsafgørelse, EU&apos;s standardkontraktbestemmelser eller
            en anden lovlig mekanisme. Oplysninger om leverandørernes egne
            overførsler findes i deres privatlivspolitikker og databehandleraftaler.
          </p>
        </section>

        <section>
          <h2>9. Hvor længe gemmer vi oplysningerne?</h2>
          <ul>
            <li>
              <strong>Konto og opsætning:</strong> så længe kontoen er aktiv og
              derefter så længe det er nødvendigt for afslutning, dokumentation og
              eventuelle lovkrav.
            </li>
            <li>
              <strong>Chatbeskeder:</strong> efter den retention-indstilling,
              virksomheden har valgt: 30, 90 eller 180 dage. En indstilling på
              &quot;aldrig&quot; betyder, at automatisk sletning ikke er slået til. Beskeder
              kan stadig slettes ved manuel anmodning eller kontosletning, med
              forbehold for lovkrav og sikkerhedskopier.
            </li>
            <li>
              <strong>Support:</strong> så længe det er nødvendigt for at behandle
              henvendelsen, dokumentere den og håndtere eventuelle tvister.
            </li>
            <li>
              <strong>Betaling og bogføring:</strong> så længe det kræves efter
              gældende bogførings- og skatteregler. Stripe kan desuden have egne
              opbevaringsperioder.
            </li>
            <li>
              <strong>Tekniske sikkerhedsdata:</strong> kun så længe det er
              nødvendigt for sikkerhed, rate limiting, fejlfinding og dokumentation.
            </li>
          </ul>
          <p>
            Når oplysninger ikke længere er nødvendige, sletter eller anonymiserer
            vi dem, medmindre vi er forpligtet til at beholde dem.
          </p>
        </section>

        <section>
          <h2>10. Sletning og dataportabilitet</h2>
          <p>
            Du kan bede om eksport eller sletning af de personoplysninger, EmbedBot
            har om dig. Ved kontosletning forsøger vi at slette virksomhedens
            profil, samtaler, website-indhold, embeddings og loginrelaterede data.
            Vi kan dog være nødt til at beholde bestemte oplysninger på grund af
            bogføring, juridiske krav, sikkerhed, tvister eller sikkerhedskopier.
          </p>
          <p>
            Send en anmodning til <a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a>.
            Vi kan bede om oplysninger, der bekræfter din identitet, før vi
            udleverer eller sletter data.
          </p>
        </section>

        <section>
          <h2>11. Dine rettigheder efter GDPR</h2>
          <p>Afhængigt af situationen har du ret til at:</p>
          <ul>
            <li>få indsigt i de personoplysninger, vi behandler om dig</li>
            <li>få urigtige oplysninger rettet</li>
            <li>få oplysninger slettet</li>
            <li>få behandlingen begrænset</li>
            <li>modtage oplysninger i et struktureret format (dataportabilitet)</li>
            <li>gøre indsigelse mod behandling, der er baseret på legitim interesse</li>
            <li>trække et samtykke tilbage, hvis behandlingen er baseret på samtykke.</li>
          </ul>
          <p>
            Kontakt os på <a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a>,
            hvis du vil gøre en rettighed gældende. Du har også ret til at klage til{" "}
            <a href="https://www.datatilsynet.dk/" target="_blank" rel="noreferrer">
              Datatilsynet
            </a>.
          </p>
        </section>

        <section>
          <h2>12. Cookies og browserlagring</h2>
          <p>
            EmbedBot kan bruge nødvendig session- og browserlagring, herunder
            cookies og/eller local storage, til login, sikkerhed, onboarding og
            brugerindstillinger. Hvis du blokerer nødvendig lagring, kan login eller
            dele af tjenesten holde op med at virke.
          </p>
          <p>
            Vi bruger også analyse- og ydeevneværktøjer som beskrevet ovenfor.
            Browserens udvikler- og privatlivsindstillinger kan begrænse visse
            målinger. Vi bruger ikke annoncecookies i den nuværende version.
          </p>
        </section>

        <section>
          <h2>13. Sikkerhed</h2>
          <p>
            Vi bruger rimelige tekniske og organisatoriske sikkerhedsforanstaltninger,
            herunder HTTPS, adgangskontrol, begrænsning af leverandøradgang,
            beskyttelse af login-sessioner og hashing af IP-adresser til
            rate limiting, hvor det er relevant. Ingen internetbaseret tjeneste kan
            garanteres at være 100 % sikker.
          </p>
          <p>
            Hvis vi opdager et sikkerhedsbrud, håndterer vi det efter gældende
            regler og kontakter berørte parter eller myndigheder, når det kræves.
          </p>
        </section>

        <section>
          <h2>14. Børn</h2>
          <p>
            EmbedBot er en erhvervstjeneste og er ikke målrettet børn. Vi forsøger
            ikke bevidst at indsamle personoplysninger fra børn uden relevant
            forældres eller værges involvering.
          </p>
        </section>

        <section>
          <h2>15. Ændringer til privatlivspolitikken</h2>
          <p>
            Vi kan opdatere denne privatlivspolitik, når tjenesten, leverandørerne
            eller lovgivningen ændrer sig. Den nyeste version er altid tilgængelig
            på denne side. Ved væsentlige ændringer vil vi, hvor det er relevant,
            informere via e-mail eller i tjenesten.
          </p>
        </section>

        <section>
          <h2>16. Kontakt</h2>
          <p>
            Spørgsmål om privatliv, sletning eller dine rettigheder kan sendes til:
          </p>
          <address className="not-italic">
            <strong>Axel Bødker Frederiksen / EmbedBot</strong>
            <br />
            Smallegade 42, 4. tv.
            <br />
            <a href="tel:+4591551250">+45 91 55 12 50</a>
            <br />
            <a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a>
          </address>
          <p>
            Du kan også besøge vores <Link href="/support">supportside</Link> eller
            læse <Link href="/terms">handelsbetingelserne</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}
