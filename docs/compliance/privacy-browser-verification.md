# Isoleret privatlivstest — 3. oktober 2026

## Resultat

Produktets rigtige React-privatlivspanel og API-handlere er afprøvet fra Chrome mod en midlertidig lokal PostgreSQL-database (PGlite) med migrations og to kunstige kunder. Ingen produktionsdata, leverandørkonti eller eksterne mails indgik.

| Handling | Kontrolleret resultat |
| --- | --- |
| Indstillinger | Dashboard viste 30/90 dage og gemte privatlivslink gennem den rigtige API. |
| Oprydning | Chat på 31 dage og ticket på 91 dage slettet; chat på 1 dag og ticket på 89 dage bevaret. Gammelt kopieret samtaleudsnit og referencer fjernet. |
| Identitetskontrol | Besøgsopslag var deaktiveret uden ejerens bekræftelse af identitetskontrol. Dette er en procesbekræftelse, ikke automatisk identitetsverifikation. |
| Besøgseksport | Faktisk JSON-download indeholdt de to relevante poster; ingen anden tenants data eller integrationscredentials. |
| Kontoeksport | Faktisk JSON-download indeholdt ejerens virksomhed, chats, tickets og integrationsmetadata; credentials og den anden tenant var udeladt. |
| Besøgssletning | Deaktiveret før særskilt slettebekræftelse. Derefter blev de to matches slettet; kundekonto og anden tenant bevaret. |
| Kontosletning | Den rigtige API slettede testkontoens virksomhed og kunstige Auth-bruger. Den anden virksomhed, chat og ticket bestod. |

Kontoeksportens navigationslink gav en blokeret side i testbrowseren. Dashboardet anvender nu samme JSON-downloadflow som besøgsdata og viser API-fejl på siden. Den efterfølgende download er læst og kontrolleret. Ingen årsag hos browserudvidelsen eller produktionsfejl er udledt alene af blokeringen.

[Maskinelt kontrollerede databaseresultater og HTTP-status](evidence/privacy-browser-2026-10-03.json) · [Skærmbillede efter test](evidence/privacy-browser-2026-10-03.png).

Samlet automatiseret kontrol: 83 tests, 82 beståede og én eksisterende ekstern netværkstest sprunget over. TypeScript og målrettet lint består. To nye tests kontrollerer den faktiske konto-slettehandler: bekræftelse, Origin, login, bevarelse ved manglende abonnementskonfiguration og tenant-afgrænset sletning.

## Afgrænsning

Dette er en komponent → HTTP → API → SQL-test. Fixture-login, Auth-sletning og Supabase-transport er simuleret; SQL-funktionerne og API-handlerne er de rigtige. Kontosletning blev kaldt fra en tydeligt markeret testknap, mens produktets eksisterende brugerflow henviser til support ved kontosletning. Ingen rigtig Supabase-login/session, betalt Stripe-opsigelse eller leverandørsletning er bevist. Databaseindhold blev kontrolleret efter hver slettefase; UI-success alene blev ikke brugt som bevis.

Den manuelle kundeophørsprocedure er kun delvist dækket: eksport og kontosletning. Stop af widget/integration under en eksportperiode, automatisk 30-dages ophørsfrist, én-bot-sletning i en konto med flere virksomheder, gendannelse, leverandørkopier, backuprotation og produktionscron kræver separat gennemførelse. Leads er afledt af chats; dashboardets fulde leadoversigt indgik ikke i denne komponenttest.

DPA er fortsat et ikke-accepterbart udkast. Testen er teknisk dokumentation, ikke en juridisk godkendelse.

## Gentagelse

Fixture: `test/helpers/privacy-browser-server.mjs`. Start med Node og absolut sti til esbuilds `lib/main.js` som argument. Denne kørsel brugte esbuild 0.25.12 installeret fra npm i `/private/tmp/embedbot-browser-tools`; projektets dependencies blev ikke ændret. Adressen er `http://localhost:4317`; serveren lytter kun på loopback og afviser andre Host-værdier. Ingen `.env` indlæses, testværdier erstatter anvendte credentials, og leverandørtransport er simuleret.

Kør indstillingsgemning, konto-/besøgseksport, testoprydning, besøgsopslag/sletning og til sidst testkontosletning. Downloadfiler skal læses og sammenholdes med fixturedata. `/__test/status` viser de kunstige rækker og HTTP-status til efterkontrol. Afslut testserveren bagefter. Fixture-ruterne må aldrig indgå i produktionsappen.
