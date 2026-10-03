# EmbedBot 1.0 — funktioner og data til aftalearbejdet

Gennemgang af lokal kode den 3. oktober 2026. Dette beskriver implementerede funktioner, ikke verificeret produktionsdrift eller Min Kreative Verdens aktive indstillinger. Ingen produktionsdata, miljøhemmeligheder eller leverandørkonti blev læst. Ingen funktioner er ændret.

## Chat og viden

- Svar om virksomhed, produkter, services, levering, retur, betaling, garanti, åbningstider og FAQ ud fra virksomhedens indstillinger og importerede kilder.
- Sprog, tone, velkomst og virksomhedens supplerende instrukser kan tilpasses. Systemprompten instruerer modellen i ikke at opfinde oplysninger eller love handlinger.
- Import af hjemmeside eller HTML-fil; tekst bruges som videnskilde. Chatten søger også i indekserede dokumenter via embeddings. Ved produktspørgsmål kan offentlige produktsider genlæses for pris og tilgængelighed uden webshopintegration. Dette er ikke privat lageradgang eller lagerantal.
- Generelle AI-svar streames, og brugerens besked, svaret og eventuel sideadresse gemmes som samtaledata. Widgetten sender origin + pathname, uden query/fragment. Seneste op til 10 beskeder bruges til kontekst.
- OpenAI modtager tekst til klassifikation, embeddings og svar. Klassifikation/embeddings og tidligere historik har begrænset redigering af emails/ordrereferencer; den aktuelle besked til svargenerering sendes som indtastet. Det er derfor ikke korrekt at love, at almindelig chat aldrig sender personoplysninger til AI.

Kilder: lib/chat-system-prompt.ts, app/api/chat/route.ts, lib/commerce/chat.ts, app/api/ingest/route.ts, app/api/dashboard/website-source/route.ts, public/widget.js.

## Supportsager og kontakt

- Besøgende kan oprette en henvendelse med kontaktmail og beskrivelse, valgfrit ordrenummer og tilvalgt samtaleudsnit. Der er ikke et særskilt navnefelt i supportformularen; navne kan forekomme i fritekst.
- Formularen viser opsummering og kræver særskilt bekræftelse før oprettelse. En sag gemmes i dashboardet med sagsnummer, og kunden kan markere den ny, under behandling eller lukket.
- Valgfri notifikation til en konfigureret modtagermail indeholder kontaktmail, beskrivelse og valgfrit ordrenummer. Samtaleudsnittet vises i dashboardet, ikke i denne notifikationsmail. Genforsøg er implementeret.
- Kontaktmail og ordrenummer i supportsager er uverificerede. Funktionen kræver fungerende databaseopsætning og sikker lagring; mail kræver desuden mailopsætning og modtager. Webshopintegration er ikke et krav for supportsager.

Kilder: public/widget.js, app/api/commerce/support/route.ts, lib/commerce/support.ts, lib/commerce/mail.ts, app/api/dashboard/tickets/route.ts, app/api/chat/route.ts.

## Webshopintegrationer

- Shopify og WooCommerce med læseadgang: produktsøgning, priser, varianter og tilgængelighed/lager i det omfang integrationen leverer det. Produktcache er op til 30 sekunder.
- Privat ordrestatus og eksisterende tracking efter ordrenummer, købsmail og engangskode til ordrens eksisterende mailadresse. Koden udløber efter 10 minutter og bruges til ét opslag; antallet af forsøg begrænses.
- Ordreformularens oplysninger og private resultater går gennem særskilte serverruter, ikke AI-svargenerering eller almindelig chathistorik. Ordrelokator kan gemmes krypteret i en tidsbegrænset challenge. Dette siger ikke noget om oplysninger, som en besøgende selv skriver i almindelig chat.
- Faktisk adgang kræver kundens forbindelse, tilladelser og serveropsætning. Ordreopslag kræver også mailopsætning.

Kilder: lib/commerce/index.ts, lib/commerce/types.ts, lib/commerce/server.ts, lib/commerce/orders.ts, app/api/commerce/orders/route.ts, app/dashboard/commerce-panel.tsx.

## Dashboard og persondata

- Samtalelæsning, søgning og sletning; FAQ kan manuelt forbedres ud fra samtaler. Statistik viser antal, emner, fallback-baseret løsningsgrad og estimeret tidsbesparelse, ikke dokumenteret kundetilfredshed eller reel tidsmåling.
- E-mailadresser fra besøgendes chatbeskeder samles automatisk i en leadoversigt med beskedudsnit, side og dato; CSV-eksport findes. Dette udpeger ikke et marketinggrundlag og bekræfter ikke identitet.
- Tilpasning af udseende, installation, konto og abonnement findes.
- Privatlivsindstillinger understøtter chat-/sagsperioder og link til kundens privatlivspolitik. Ejer kan søge, eksportere og slette besøgsdata efter bekræftet identitetskontrol; kontoeksport og kontosletning findes. De konkrete flows kræver tilhørende databaseopsætning; drift af cleanup er ikke verificeret her.

Kilder: app/dashboard/page.tsx (leadudtræk omkring linje 487–507 og CSV omkring 545), app/api/dashboard/privacy/route.ts, app/api/dashboard/visitor-data/route.ts, app/api/auth/export-data/route.ts, app/api/auth/delete-account/route.ts.

## Grænser

Ingen implementeret annullering/refundering/ændring af ordrer via chatbotten, ingen billedvedhæftninger eller live overdragelse til en medarbejder. Dashboardets sagsrute ændrer status/genforsøger notifikation; den sender ikke et svar til kunden. Systempromptens regler er instrukser til modellen, ikke garanti for fejlfri adfærd.

## Min Kreative Verden

Aftalen skal tage højde for chatlagring, leadudtræk, support og valgte integrationer. Kundens faktiske funktionsvalg og forbindelsesstatus er endnu ikke verificeret. Navnet EmbedBot 1.0 i dette notat følger Axels betegnelse for dette projekt.
