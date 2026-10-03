> HISTORISK DOKUMENT — ikke aktuel produktionsstatus eller installationsvejledning. Se [nuværende compliance-dokumentation](compliance/README.md). Krav og observationer nedenfor beskriver en tidligere gennemgang.

# EmbedBot: gennemgang af compliance-listen

Gennemgået 2. oktober 2026. Grundlag: brugerens indsatte 23-punktsliste, det offentlige live-site, applikationskode, databaseopsætning i produktion og eksisterende tests.

## Konklusion

EmbedBot har allerede privatlivspolitik, handelsbetingelser, cookiepolitik, samtykkevalg, kontoeksport, slette-endpoints, en 90-dages chatpolitik og væsentlige sikkerhedsforanstaltninger. Den samlede pakke er dog ikke færdig. De vigtigste huller er en konkret kundedatabehandleraftale, præcis leverandør-/overførselsdokumentation, tydelig AI-oplysning i widgetten, opbevaring/eksport/sletning af supportsager samt interne procedurer.

"Ikke fundet" nedenfor betyder ikke fundet i det gennemgåede site og repository. Underskrevne aftaler, uddannelsesmateriale og interne dokumenter kan eksistere andetsteds og skal i så fald fremlægges og kontrolleres.

## Omfang og kontrol

- Live gennemgået: `/`, `/privacy`, `/terms`, `/cookies`, `/refunds`, `/data-requests`, `/prices`, `/faq`, `/support`, `/pilot` og indgangen til `/setup`. Den rigtige demo-widget blev åbnet uden at sende chatbeskeder eller supportsager. Cookieindstillinger kunne åbnes med både accept og afvisning.
- Dashboard, administratorfunktioner, onboarding efter login, dataeksport, sletning, chat, integrationer og oprydning blev gennemgået via kode og databaseopsætning. Der blev ikke oprettet en konto, accepteret handelsbetingelser, foretaget betaling eller slettet produktionsdata.
- Supabase-projektet `embedbot`: region `eu-central-1`. De ni kontrollerede EmbedBot-tabeller har RLS slået til. Produktionspolitikker for virksomheder, samtaler, dokumenter og kundebeskeder begrænser læsning til ejeren. Commerce-tabeller og websitekilder har ikke browsergrants. De kontrollerede følsomme databasefunktioner kan ikke kaldes af `anon` eller `authenticated`.
- Alle fire virksomheder har `retention_days = 90`; kolonnens database-default er også 90. Der var ingen udløbne chats, ordreudfordringer eller forbindelsesforsøg ved læsekontrollen. Dette beviser ikke, at en scheduler har kørt.
- Produktionsfunktionerne til chatoprydning og kontosletning findes. Fremmednøgler sletter relaterede chats, supportsager, integrationer og websitekilder ved sletning af virksomheden.
- `npm test`: 63 tests, 62 bestået, 1 sprunget over, 0 fejl. Tests bruger isoleret database og mocks. Der blev ikke kørt en destruktiv slut-til-slut-test i produktion.
- Vercels projektværktøj fejlede med en argumentfejl; logværktøjet svarede med manglende adgang. Faktisk schedulerafvikling, Vercel-region, miljøopsætning og backup-/gendannelsesopsætning er derfor ikke verificeret. Det er ikke dokumentation for, at funktionerne er ude af drift.

## De 23 punkter

| Nr. | Punkt fra listen | Status | Fund og næste skridt |
|---:|---|---|---|
| 1 | Privatlivspolitik | Delvist på plads | Offentlig og omfattende, men senest opdateret 17. september. Udbyg med ordreverificering, webshopintegrationer, kunders supportsager, kopier i notifikationsmails og automatisk leadudtræk. Virksomhedsidentitet bør ensrettes og suppleres med registreret adresse/CVR, hvis relevant. |
| 2 | Databehandleraftale, DPA | Ikke fundet | Vilkårene kræver den før behandling af besøgendes oplysninger, men der findes ingen konkret aftale, bilag, adgang til aftalen eller registrering af indgåelse i det gennemgåede materiale. En særskilt underskrevet aftale kan opfylde behovet; den behøver ikke indgås via en offentlig side. |
| 3 | Underdatabehandlere | Delvist på plads | Privatlivspolitikken navngiver seks leverandører, men angiver ikke en aftalespecifik liste med juridiske enheder, datatyper, behandlingssteder og procedure for ændringer/indsigelser. Skeln mellem underdatabehandlere for kundedata og leverandører med andre roller, fx Stripe for visse betalingsformål. |
| 4 | Internationale overførsler | Ikke tilstrækkeligt dokumenteret | Politikken siger generelt SCC/tilstrækkelighedsafgørelse/anden mekanisme. Der mangler dokumentation for den konkrete mekanisme hos hver relevant leverandør, aftaler og faktisk opsætning. EU-region på databasen afgør ikke hele leverandørkædens overførsler. |
| 5 | GDPR-fortegnelse | Ikke fundet | Der findes teknisk arkitekturdokumentation og gamle audits, men ingen samlet artikel 30-fortegnelse for EmbedBots egne behandlinger og behandling på kundernes vegne. |
| 6 | Opbevaring og automatisk sletning | Delvist på plads | 90 dage er verificeret i databasen, og chatoprydning er implementeret. Dashboardet mangler valg af opbevaringstid. Supportsager har ingen aldersbaseret sletning. Oprydning af ordreudfordringer afhænger af et separat job uden plan i `vercel.json`. |
| 7 | Ret til sletning | Delvist på plads | Beskyttede endpoints kan slette chats og hele kontoen; konto-/virksomhedssletning omfatter også nye commerce-data via cascade. Der mangler et praktisk flow til sletning af en bestemt besøgendes data på tværs af chats og supportsager. Den aktuelle UI henviser primært til en manuel anmodning. |
| 8 | Indsigt og eksport | Delvist på plads | Kontoeksport findes og kræver login. Den udelader `commerce_tickets`, `website_sources` og profilrækken. Supportsager indeholder mail, beskrivelse, muligt ordrenummer og valgfri samtalekontekst. Der mangler målrettet besøgendeeksport og dokumenteret fuldstændighed/paginering. |
| 9 | Dataminimering | Delvist på plads | Ordreflowet returnerer begrænset status/tracking efter kode; credentials og private formularflows holdes fra modellen. Chatwidgetten sender dog hele sidens URL, og den aktuelle almindelige chatbesked sendes uden redaktion til svarmodellen. Ord og historik redigeres delvist i andre AI-kald. Strip URL-query/fragment, hvor de ikke er nødvendige, og fastlæg håndtering af uønskede persondata. |
| 10 | Kryptering og sikkerhed | Væsentlig teknik på plads; drift delvist verificeret | HTTPS, headers, ejerkontrol, RLS, rate limits, CSRF, AES-GCM-krypterede webshopcredentials og kodeverificering er implementeret. Auditspor for følsomme handlinger, backup-/gendannelsesbeviser, adgangsrevision og nøgleprocedurer er ikke fuldt dokumenteret. Supabase melder desuden, at beskyttelse mod lækkede adgangskoder er deaktiveret. |
| 11 | Databrudsprocedure | Ikke fundet | Privatlivspolitikken lover håndtering efter reglerne. Ingen konkret plan med ansvar, eskalation, kundekontakter, brudlog og underretningsprocedure fundet. |
| 12 | Cookies/lagring i widgetten | Delvist på plads | Ingen annoncepixels eller cross-site-tracking fundet i widgetkoden; samtale og ordre-session ligger i hukommelsen. Widgetten læser/skriver config i local storage ved indlæsning uden udløbstid og henter som standard Google Fonts. Nødvendighed/aktivering bør vurderes, og kunden skal have præcis installationsinformation. |
| 13 | Cookies på EmbedBots site | Delvist på plads | Analyse indlæses kun ved accept i komponenten; der er afvisning og mulighed for at genåbne valget. Cookiepolitikken mangler en konkret lagringsoversigt med navne, formål, leverandører og varighed. Tilbagetrækning skal stoppe allerede indlæste analyseværktøjer; komponenten afmonterer dem alene. |
| 14 | AI Act: AI-identifikation | Bør forbedres nu | Den rigtige live-widget viser `EmbedBot ChatBot`, en hilsen og `Lavet af EmbedBot · Privatliv`. Ingen fast eksplicit `AI-assistent`-tekst. Tilføj klar oplysning ved første interaktion, uafhængigt af kundens branding og velkomsttekst. Vurder også relevante artikel 50-forpligtelser om maskinlæsbar outputmærkning; UI-tekst dækker ikke automatisk dem. |
| 15 | AI-færdigheder | Ikke dokumenteret | Ingen procedure eller dokumentation for AI-færdigheder fundet. Det skal vurderes for de personer, der arbejder med systemet nu, ikke først ved større virksomhed. |
| 16 | Hallucinationer | Væsentlige værn på plads | Fælles prompt forbyder opfundne ordre-/leveringsdata og skelner mellem live opslag og hjemmesideviden. Private ordredata vises via et separat serverkontrolleret flow. Dette er værn, ikke en garanti for alle fritekstsvars korrekthed. Et udvalg af realistiske fejl-/modstridsscenarier bør indgå i løbende kvalitetskontrol. |
| 17 | Handelsbetingelser | På plads med rettelser | Betaling, opsigelse, ansvar, acceptable use, AI, rettigheder og lovvalg er dækket. Live-sitets tekster om gratis prøveperiode og kortkrav er modstridende. Aftaleidentitet/adresse/CVR og registrering af accepteret dokumentversion skal afklares. |
| 18 | Acceptable Use Policy | Basis dækket i vilkår | Afsnit 9 forbyder bl.a. ulovligt indhold, spam, phishing og malware. Udbyg evt. med ulovlig overvågning, diskriminerende beslutninger og ikke-understøttede højrisikoscenarier. En separat side er et produkt-/aftalevalg; det er ikke i sig selv et generelt krav. |
| 19 | AI-vilkår | På plads som basis | Afsnit 10 beskriver fejl og ufuldstændighed og begrænser brug til højrisikorådgivning. Kundens ansvar for materiale/instruktioner dækkes i afsnit 6. |
| 20 | Marketing/cold email | Delvist på plads; praksis uverificeret | Demo-mailen har afmeldingslink, men endpointet kræver ikke dokumenteret samtykke/demoanmodning og tjekker ingen suppressionliste. Det beviser ikke ulovlige faktiske udsendelser. Automatisk leadudtræk fra chats er heller ikke et samtykke til markedsføring. |
| 21 | DPIA | Screening ikke fundet | Ingen dokumenteret screening/procedure fundet. En fuld konsekvensanalyse er ikke automatisk nødvendig for enhver bot; dokumentér vurderingen af risiko og begrænsninger for de aktuelle anvendelser. |
| 22 | Privacy by Design | Delvist på plads | Ejerskab, tenant-afgrænset søgning, serverprivate credentials og separat ordreverificering er gode byggesten. Retention, rettighedsflows, unødvendige URL-data og livscyklus for supportsager skal dækkes sammenhængende. |
| 23 | Samlet compliance-pakke/Privacy-område | Ikke færdig | Dashboardet har kontoeksport og link til dataanmodning, men ikke det foreslåede område med retention, besøgendeeksport/-sletning, DPA og underdatabehandlere. Den præcise dashboardstruktur og 7/30/90-dages valg er forslag, ikke generelle lovkrav. |

## Vigtigste konkrete fund

### 1. Kundedatabehandleraftalen skal være konkret og indgået

`app/terms/page.tsx:22` siger, at aftalen skal være indgået før behandling af besøgendes personoplysninger. `app/privacy/page.tsx:34` henviser til at kontakte EmbedBot ved behov for en aftale. Det er ikke selve aftalen.

Lav aftale og bilag om instrukser, behandlingens formål/varighed, registrerede/datatyper, sikkerhed, assistance, databrud, underdatabehandlere, overførsler, kontrol og tilbagelevering/sletning. Registrér, hvilken kunde der har indgået hvilken version og hvornår. Dette skal også dække eksisterende kunder og piloter, der behandler personoplysninger. Undersøg først, om en gyldig aftale allerede findes uden for repository.

### 2. Supportsager falder uden for den almindelige datalivscyklus

`commerce_tickets` indeholder persondata og kan indeholde en kopi af chatkontekst. `docs/embedbot-2.0.md:126` dokumenterer, at sager bevares indtil bot/konto slettes. Chatoprydning i `app/api/cron/cleanup/route.ts` og databasefunktionen behandler ikke disse sager. Derfor kan chattekst fortsat findes i en supportsag, efter den oprindelige chat er slettet.

`app/api/auth/export-data/route.ts:106` samler kun chats, dokumenter, gamle kundebeskeder og EmbedBots egne supportbeskeder. Nye supportsager og websitekilder mangler. `app/api/dashboard/tickets/route.ts` har kun hentning, statusændring og mailgenforsøg, ingen målrettet sletning.

Fastlæg en særskilt begrundet slettefrist for supportsager og deres kontekst, udbyg eksport/sletning, og dokumentér mailkopier og leverandørlogs. Kontosletning behøver ikke repareres for cascade alene: relationerne er verificeret i produktion.

### 3. Oprydning af ordreoplysninger afhænger af et job uden plan i projektet

`lib/commerce/mail.ts:31` sletter udløbne ordreudfordringer og forbindelsesforsøg, når `/api/cron/support` kører. `vercel.json` planlægger kun `/api/cron/cleanup`. Udløb af en engangskode forhindrer brug, men er ikke det samme som sletning af den tilhørende krypterede ordrelokator.

Der var ingen udløbne rækker ved kontrollen. En ekstern scheduler kan være konfigureret; den er ikke verificeret. Tilføj dokumenteret scheduler eller flyt den nødvendige oprydning ind i et eksisterende verificeret job, og overvåg fejl/seneste vellykkede afvikling.

### 4. Tydelig AI-oplysning og kundens egen privatlivsmeddelelse

`public/widget.js:211` og `public/widget.js:231` indeholder generisk chattitel og EmbedBot-branding. Den åbne live-demo havde heller ingen fast eksplicit AI-mærkning. Tilføj fx `AI-assistent · Privatliv` ved første interaktion.

Privatlivslinket peger altid på EmbedBots politik. Tilføj mulighed for kundens egen politik/information om den behandling, kunden er dataansvarlig for. Et link til EmbedBot alene oplyser ikke alle kundens egne formål og behandlingsgrundlag.

### 5. Cookieinformation og tilbagetrækning er ikke fuldt gennemført

`public/widget.js:491` gemmer config uden timestamp/TTL, selvom cookiepolitikken beskriver kortvarig cache. `public/widget.js:85` henter Google Fonts; dette kan ske før brugeren åbner chatten. Der er ikke fundet marketingtracking i widgetten. Afklar nødvendighed og overvej hukommelsescache/systemfont eller selvhostede fonte som standard.

`app/components/cookie-consent.tsx:56` gemmer et nyt valg, men genindlæser ikke siden og kalder ikke en stopfunktion. De installerede Vercel-komponenters effekter injicerer scripts uden en cleanup ved afmontering; Plausible indlæses også som script. En ændring af React-visningen dokumenterer derfor ikke stop af allerede installerede målinger. Implementér og verificér øjeblikkelig tilbagetrækning. Faktiske netværkshændelser efter tilbagetrækning er ikke testet her.

### 6. Live-sitets prøveperiodeoplysninger er modstridende

Forsiden og `/pilot` siger, at betalingskort kræves. `/terms` afsnit 3 og `/refunds` siger, at piloten ikke kræver kort og ikke automatisk bliver betalt. Det kan være to forskellige tilbud, men de skal i så fald adskilles tydeligt. Beskriv ét entydigt forløb på de relevante sider, ved checkout og i mails, inkl. hvad der sker på dag 15.

### 7. Interne dokumenter og leverandøraftaler skal kunne fremvises

Ikke fundet: samlet fortegnelse, operationel sikkerhedspolitik, databrudsplan/-register, procedure for indsigts-/sletteanmodninger, AI-færdigheder og DPIA/AI-risikoscreening. Arkitekturbeskrivelser og en tidligere audit er ikke tilsammen dokumentation for disse processer.

Ikke verificeret: indgåede leverandøraftaler, faktisk OpenAI-dataregion/-opbevaringsopsætning, overførselsmekanismer, backupretention, gendannelsestest og adgangsrevision. Det skal afklares ud fra den konkrete konto og aftale; leverandørens generelle privacy-link er ikke tilstrækkeligt bevis.

### 8. Sikkerhed og dokumentation kræver enkelte særskilte rettelser

Supabases sikkerhedskontrol melder deaktiveret beskyttelse mod kompromitterede adgangskoder og `vector`-udvidelsen i public-schema. Første punkt bør aktiveres, hvis planen understøtter det, ellers håndteres med relevante alternative loginværn. Schema-advarslen bør vurderes særskilt, ikke udlægges som en dokumenteret datalækage. [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) og [database-linter](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

"RLS enabled no policy" er forventeligt for de serverprivate tabeller, hvor browsergrants er fjernet; det bør ikke løses ved at åbne dem for browseren.

`lib/admin-auth.ts:38` accepterer administratoradgang med korrekt fælles adgangskode plus den oplyste administrator-mail, uden at kræve Supabase-session i den gren. Det gør mail-headeren til en identitetsangivelse, ikke en anden sikkerhedsfaktor. Overvej individuel verificeret session/MFA og auditspor for følsomme handlinger.

Gamle dokumenter bør opdateres: `sql/create_conversations_table.sql` kan oprette en bred `USING (true)`-læsepolitik, hvis det genkøres; produktionspolitikken er nu korrekt. `DEPLOYMENT_GUIDE.md` henviser til en ikke-eksisterende GDPR-fil og har en forkert generel påstand om OpenAI-retention. Gamle beskrivelser af "full compliance ready" bør ikke bruges som status for den nuværende pakke.

## Anbefalet rækkefølge

1. Afklar og indgå konkret DPA for nuværende kunder; færdiggør bilag og leverandør-/overførselsdokumentation.
2. Tilføj fast AI-oplysning og mulighed for kundens privatlivslink; ret prøveperiode-/kortteksterne og virksomhedsidentiteten.
3. Saml rettigheds- og sletteflows for chats, supportsager, websitekilder og relevante konto-/profiloplysninger; giv supportsager en begrundet opbevaringsfrist.
4. Verificér jobs og fejlalarmer for begge oprydningsforløb; kontroller cookie-tilbagetrækning og widgetlagring.
5. Lav intern fortegnelse, sikkerheds-/brudprocedure, AI-færdighedsforløb og risikoscreening. Kontroller backup, administratoradgang og marketingens samtykke-/afmeldingsproces.

Der er oprettet denne gennemgang; produktet, politikker, aftaler og produktionsindstillinger er ikke ændret.

## Primære kilder til krav og afgrænsning

- [Datatilsynet: databehandleraftaler og indsigt, myter om GDPR](https://www.datatilsynet.dk/regler-og-vejledning/myter-om-gdpr).
- [Datatilsynet: retvisende underdatabehandlerliste, godkendelse og internationale overførsler](https://www.datatilsynet.dk/afgoerelser/afgoerelser/2026/jan/vilkaar-i-databehandleraftalen-om-overfoersler-af-personoplysninger-til-tredjelande).
- [Datatilsynet: sletning og opfølgning på slettekørsler](https://www.datatilsynet.dk/regler-og-vejledning/behandlingssikkerhed/sletning).
- [Datatilsynet: cookieinformation, varighed og tilbagetrækning](https://www.datatilsynet.dk/Media/E/7/Quickguide.pdf).
- [Digitaliseringsstyrelsen: gennemsigtighed ved AI-interaktion og øvrige artikel 50-forpligtelser](https://digst.dk/tilsyn/ai-forordningen/reglerne-i-ai-forordningen/gennemsigtighedsforpligtelser-for-visse-ai-systemer/).
- [Digitaliseringsstyrelsen: AI-færdigheder og første interaktion](https://digst.dk/tilsyn/ai-forordningen/faq-om-ai-forordningen/).
- [Forbrugerombudsmanden: spamforbuddet gælder også virksomheder](https://forbrugerombudsmanden.dk/alle-emner/uanmodede-henvendelser/uanmodede-elektroniske-henvendelser-spam).
- [Forbrugerombudsmanden: tilbagekaldelse via mailklient skal efterkommes](https://forbrugerombudsmanden.dk/find-sager/sager/markedsfoeringsloven/sager-efter-markedsfoeringsloven/spam/virksomheder-er-forpligtede-til-at-efterkomme-naar-personer-tilbagekalder-et-samtykke-til-elektronisk-markedsfoering-via-personens-mail-klient).
- [Datatilsynet: risikovurdering](https://www.datatilsynet.dk/regler-og-vejledning/behandlingssikkerhed/risikovurdering).
- [Datatilsynet: håndtering af persondatabrud](https://www.datatilsynet.dk/Media/637886298435856391/H%C3%A5ndtering%20af%20brud%20p%C3%A5%20persondatasikkerheden.pdf).
