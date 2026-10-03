# Min Kreative Verden — forberedelse af databehandleraftale

Internt arbejdsnotat, 3. oktober 2026. Ikke en godkendt eller indgået aftale.

## Bekræftet af Axel

- Tjeneste: EmbedBot 1.0 i dette projekt.
- Kunde-/butiksnavn: Min Kreative Verden. Juridisk aftalepart er endnu ikke verificeret.
- Brug: kundens rigtige hjemmeside, ikke en demo med testdata.
- Tilbud: 14 dages gratis prøveperiode, ikke en pilot. Start- og slutdato er endnu ikke oplyst eller dokumenteret aftalt.
- EmbedBots aftalepart og kontaktdata: se [aftalepartsnotatet](contracting-party.md).
- Kontaktperson: Josefine Bjørn Knudsen, kundeservice@minkreativeverden.dk, oplyst af Axel. Bemyndigelse til at indgå aftalen er endnu ikke bekræftet.
- Axel præciserer: Den eksisterende chatbot/konto er oprettet af ham som demo, så Josefine kan se løsningen. Hun skal oprette sin egen konto/chatbot, hvis hun ønsker dashboard og at bruge tjenesten. Den læste demokonto er ikke hendes egen kundekonto.
- Der er endnu ikke aftalt opbevaringsperioder for samtaler eller supportsager med Josefine. Demoens tekniske indstillinger er ikke en aftale eller kundeinstruks.
- Axel har bekræftet, at demoen vises via preview. Den tidligere oplysning om brug på hendes rigtige hjemmeside beskriver den påtænkte brug, ikke en allerede installeret chatbot. Ingen aktuel installation på hendes hjemmeside er oplyst.

## Oplysninger, der udestår

- Kundens hjemmeside, officielle juridiske navn, CVR/registrering, adresse og autoriserede kontaktperson.
- Faktisk funktionsvalg for kunden: almindelig chat, kontaktindsamling, support, ordreopslag og videnskilder skal afklares.
- Implementerede muligheder er nu kortlagt i [EmbedBot 1.0 — funktioner og data](embedbot-1-0-capabilities.md). Det omfatter også automatisk leadudtræk fra chat; kundens aktive opsætning er fortsat uverificeret.
- Behandlingsinstrukser, datatyper, opbevaringsperioder og sletning/returnering ved ophør.
- Verificerede leverandøraftaler, modtagere, behandlingssteder og eventuelle overførsler.
- Sikkerheds-, assistance-, kontakt- og auditbilag samt endeligt review/godkendelse.

Eksisterende grundlag: DPA-version 2026-10-02.draft-1 i lib/compliance/legal-documents.json. Den er et udkast og kan ikke accepteres. Dette notat ændrer ikke dokumentarkivet eller publiceringsstatus.

## Oplysninger fra kundens hjemmeside

Axel har oplyst hjemmesiden http://minkreativeverden.dk/, som viderestiller til https://minkreativeverden.dk/. Sidens kontaktområde blev læst den 3. oktober 2026 og angiver:

- Navn: Min Kreative Verden.
- CVR: 42875554.
- Adresse: Christian 8.s vej 6A, 8600 Silkeborg.
- E-mail: kundeservice@minkreativeverden.dk.

Kilde: [Min Kreative Verdens hjemmeside](https://minkreativeverden.dk/). Oplysningerne er fundet på hjemmesiden, ikke verificeret i CVR-registeret. Det officielle juridiske navn og den registrerede adresse skal fortsat bekræftes. Kontaktpersonen er oplyst af Axel ovenfor; bemyndigelse til at indgå aftalen er endnu ikke bekræftet. Hjemmesidens servicevilkår kunne ikke hentes ved dette opslag.

## Demokonfiguration læst i projektets database — 3. oktober 2026

Et afgrænset læseopslag med projektets lokale databaseforbindelse fandt én virksomhed ved navnesøgning, med website https://minkreativeverden.dk/. Axel har efterfølgende præciseret, at dette er hans demo til Josefine. Resultaterne nedenfor dokumenterer kun denne demo, ikke hendes fremtidige kundekonto. Der blev ikke læst samtaler, supportsager, integrationscredentials eller loginoplysninger; ingen data blev ændret. Forbindelsen er ikke særskilt verificeret mod Vercels aktive produktionsmiljø.

- Konto: activated=true, subscription_status=trialing.
- Samtalernes retention_days: 90. Dette er eksisterende konfiguration, ikke en godkendt behandlingsinstruks eller bevis på udført cleanup.
- Hjemmesidekilde: URL-import fra https://minkreativeverden.dk/, imported_at=2026-10-02T15:25:54.273+00:00.
- Webshopintegration: ingen commerce_integrations-record fundet. Live integrationsbaserede produkt-/lageropslag og privat ordrestatus er derfor ikke konfigureret i denne database. Offentlige produktopslag fra hjemmesidekilden kan stadig bruges.
- Supportnotifikationsmodtager: kundeservice@minkreativeverden.dk. Faktisk mailafsendelse og serveropsætning er ikke testet.
- business_privacy_settings: forespørgslen fejlede med PGRST205, som angiver manglende tilgængelig tabel i Data API/schema-cache. Privatlivsflow og særskilt ticketretention kunne derfor ikke verificeres; schema/migration/cache skal undersøges særskilt før man lover disse funktioner.
- businesses.platform: feltet er ikke tilgængeligt (42703); integrationsstatus ovenfor er læst direkte fra commerce_integrations.

Demoens konfiguration omfatter hjemmesidebaseret chat og en supportnotifikationsmodtager. Projektets kode understøtter også gemte samtaler og automatisk leadoversigt. Dette fastlægger ikke kundens fremtidige funktionsvalg; de skal afklares ved hendes egen oprettelse. Ingen kundeaccept, behandlingsinstruks, retentionaftale eller igangsat gratis prøveperiode udledes af demoens status.
