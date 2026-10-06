# Kundernes nye arbejdsområde

Det eksisterende dashboard viser **Nye funktioner** for den valgte chatbot. Adressen er `/dashboard/workspace/<business-id>`. Den lokale `/dashboard/lab` er fortsat en separat udviklingsdemo.

## Forløb og lagring

- Dashboard-API'et kræver en verificeret login-session og kontrollerer chatbot-ejerskab på hver forespørgsel. POST kræver samme origin. Alle databaseforespørgsler filtreres på den ejervalidede chatbot.
- Kundeindsigter, videnshuller og feedback bruger op til 1.000 seneste reelle samtaler. Der indsættes ingen eksempeldata. Supportsager og leads viser op til 300 seneste poster, og historikken op til 1.000 poster.
- Flere videnskilder, midlertidige beskeder, startknapper og gemte tests ligger i `workspace_settings`. Gemning bruger databasebaseret revisionskontrol, også på tværs af serverinstanser. Samtaler og supportsager kopieres ikke ind i indstillingsdokumentet.
- Den eksisterende hjemmesidekilde vises fortsat som en kilde. Andre indstillingsændringer kopierer den ikke, så eksisterende importer stadig opdateres. En bevidst redigering/fjernelse i det nye arbejdsområde gør arbejdsområdets version gældende for chatten.
- AI-chatten modtager godkendte videnskilder og aktive midlertidige beskeder. Testområdet kan vise kildeuddrag eller AI-svar; AI-tests bruger månedens normale AI-kvote, men opretter ingen kundesamtaler. Kontaktoplysninger i AI-tests stammer fra virksomhedens oplysninger.
- Den offentlige widget får kun startknapper, aktive beskeder og tilbudsknappens indstillinger. Kunden vælger selv tekster og sidevalg. Eksisterende farveindstillinger bevares. Installation og klik gemmes i `workspace_activity`.
- Feedback kræver en krypteret samtalereference bundet til chatbot og widget-session. At kende et samtale-id giver ikke ret til at afgive feedback. Offentlige handlinger er begrænset og bruger den eksisterende abonnementskontrol og ratebegrænsning.
- Tilbudsformularen er som udgangspunkt slået fra, indtil ejeren vælger at vise den. Kunden gennemgår og bekræfter indholdet. Databasefunktionen opretter et lead og en eksisterende supportsag i én transaktion. Sessionsbundne indsendelsesnøgler forhindrer dobbeltoprettelser ved genforsøg. Budget og tidspunkt ligger i leadet.
- Interne noter bliver i dashboardet. Et aktivt valg af **Send svar til kunden** opretter en historikpost og sender via Resend. Dashboardet skelner mellem sendt og afventende. Provider-idempotens og en databasebaseret claim beskytter genforsøg mod dobbeltmails; automatisk genforsøg stopper efter fem forsøg/23 timer.
- Den ugentlige opsummering er frivillig. Den eksisterende support-cron kører dagligt kl. 08:05 UTC og sender den valgte ugedags opsummering om formiddagen i Danmark. Den bruger fast provider-idempotens for den ugentlige periode og en gemt afsendelsestid. Mails sendes kun med aktiveret indstilling, konfigureret mailudbyder og virksomhedens kontaktmail. Jobbet behandler op til 100 aktiverede arbejdsområder pr. kørsel; dette skal udvides før den grænse nås.

## Adgang, eksport og sletning

Migrationen `20261006205615_production_workspace.sql` er anvendt på EmbedBots tilknyttede Supabase-projekt. RLS er slået til; browserroller har ingen tabel- eller funktionsadgang. Serveren bruger den eksisterende private adgang og ejerskabskontrol. Databasens advisor viser derfor informationsnoter om servertabeller uden klientpolicies, som for de eksisterende commerce-tabeller.

Feedback følger samtalens sletning, og leads/noter/svar følger supportsagens sletning og eksisterende opbevaringsperiode. Kontosletning fjerner alle de nye poster gennem fremmednøgler. Kontoeksport inkluderer arbejdsområdets tabeller, og besøgendes eksport inkluderer feedback på samtalen samt leads og historik på supportsagen. Eksisterende besøgendes sletning fjerner også de tilknyttede poster. Oprydningen fjerner feedback til blødt slettede samtaler og indstillinger for blødt slettede virksomheder.

## Kontrol

Databasetests kontrollerer afviste browserroller, revisionskonflikter, tenantadskillelse, eksporter, indsendelses-idempotens og kaskadesletning. Routetests bruger isoleret PostgreSQL og simuleret auth/mail til at gennemføre kilde, testsvar, feedback, lead, supportsag og svarafsendelse. Widgettests kører den faktiske JavaScript-fil og kræver gennemgang før indsendelse. Der sendes ingen rigtige kundemails under disse tests.
