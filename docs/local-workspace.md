# Lokal første version af dashboardfunktioner

Åbn `/dashboard/lab` på udviklingsserveren. Den lokale demo er adskilt fra det eksisterende kundedashboard og ligger bag både development-kontrol og loopback-kontrol i API'et. Indgangen findes også i det eksisterende dashboard med `?preview=1`.

## De 11 funktioner

1. Videnshuller: grupperede spørgsmål med samtaleeksempler, skjul/gendan, tilføj svar som videnskilde og gå direkte til test.
2. Kundeindsigter: gentagne emner, forslag til forbedringer og samtalerne bag. Regelbaserede forslag, ikke målt købspåvirkning.
3. Videnskilder: flere tekst-/HTTPS-/PDF-kilder, redigering, timestamps, kontrollér hjemmesideændringer, gennemgå og godkend ny version. PDF kræver tekst; ingen OCR. Begrænset kontrol af forskellige leveringstider.
4. Testområde: enkeltspørgsmål, gemte tests, kør alle, forventet tekstmatch og de udvalgte kilder. Ingen indskrivning i demosamtaler under test.
5. Supportsager: status, interne noter, lokalt svar, historik og svarudkast. Mail bliver ikke sendt i demoen.
6. Feedback: ja/nej og frivillig kommentar efter svar i den rigtige widget. Dashboard med stikprøvestørrelse, negative svar og relevante spørgsmål.
7. Midlertidige beskeder: start/slut, slå til/fra, redigér og automatisk udløb ved opslag. Aktive beskeder indgår i test/chat.
8. Startbeskeder: navn, valgfri velkomst, op til 12 startknapper, separate knaptekster/beskeder, rækkefølge, sidevalg og klikantal. Kunden bestemmer også, om tilbudsknappen skal vises, og dens tekst.
9. Leads: frivilligt tilbudsflow med gennemgang, behov/budget/tidspunkt, oprettelse af lead og sag, status og interne opfølgningsnoter.
10. Installation: rigtig widget-heartbeat fra den lokale testside, kilde-/AI-/supportstatus og testside. Verificerer ikke en kundes eksterne hjemmeside eller maillevering.
11. Ugentlig opsummering: de seneste syv dage, handlingslinks, download, gemt rapport og ugedag. Lokal planlægning kontrolleres hvert minut, mens dashboardet er åbent. Klokken 09 i Europe/Copenhagen, også over skift til/fra sommertid. Ingen mailafsendelse eller driftsscheduler er tilkoblet.

## Farver

Dashboard, lokal testside og demo-widget bruger appens fælles farver fra `app/globals.css`: varme, lyse flader og mørke knapper. Statusfarverne er også fælles med det eksisterende dashboard. Kundernes almindelige widgets beholder deres egne farvevalg.

## Data og svarmetoder

`.local-workspace/workspace.json` gemmer den isolerede demos tilstand med atomare writes. Mappen er ignoreret i Git. Demoen bruger syntetiske kundedata og foretager ingen writes til Supabase eller Stripe. API'et kræver lokal Host og same-origin ved POST. Ingen CORS-adgang gives til den lokale datarute. GET er læsning.

Standard er **Lokal kildedemo · uden AI**, som viser relevante tekstuddrag fra kilderne. Den er mærket i både dashboard og widget. **Rigtige AI-svar** kan vælges i testområdet og bruger den eksisterende OpenAI-opsætning og fælles chatprompt. Providerfejl vises uden interne nøgler eller rå fejltekst. På tidspunktet for implementeringen afviste OpenAI projektets nøgle med 401; rigtig AI er derfor ikke verificeret. Kildedemoen og svarudkast ud fra kilder fungerer uden AI.

Aktive kilder bruges først efter gemning/godkendelse. Eksempler på gamle manglende svar vises, indtil de er behandlet; en ny manglende besvarelse kan åbne emnet igen. Midlertidige beskeder bliver aldrig aktive før start eller efter slut.

## Afprøvning

- `npm test`: omfatter de nye tests af udløb, sidevalg, evidence, historik, origin-kontrol, atomare samtidige ændringer og ugentlig planlægning.
- `node scripts/verify-local-workspace.mjs http://127.0.0.1:3001`: integrationstest af den kørende lokale server. Opretter syntetiske chats, feedback, lead og supportsag i demoen; PDF-testkilden fjernes igen.
- `npx tsc --noEmit` og den relevante ESLint-kontrol.

En separat dev-server kan startes med `EMBEDBOT_LOCAL_DIST_DIR=.next-workspace npm run dev -- --port 3001 --hostname 127.0.0.1`, uden at overtage en eksisterende server på port 3000.

## Før en produktionsversion

Dette er en funktionel lokal gennemgangsversion, ikke en kundedeployment. Før produktionsaktivering skal den lokale store erstattes med ejerbeskyttet databaselagring og migrations-/retention-/eksport-/sletteflows; kundesvar og uge-mails skal integreres med mailudbyderen og prøves; hjemmesidekontroller og uge-mails skal have en driftsscheduler. Installation på eksterne sider kræver et separat beskyttet offentligt heartbeat-flow. Demoen er deaktiveret i production, og den eksisterende widget har kun demo-adfærd, når den får lokal demo-konfiguration.

## Produktionsarbejdsområde

De nye funktioner findes nu også som et separat kundearbejdsområde via **Nye funktioner** i dashboardet. Se `docs/production-workspace.md` for lagring, integrationer og grænser. Denne fil beskriver fortsat den isolerede lokale demo.
