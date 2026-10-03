# Intern status — renskrevet DPA til visning

3. oktober 2026. Kunden modtager aftaleteksten, ikke dette interne notat.

## Godkendelse og afgrænsning

Axel har i chatten godkendt det foreliggende indhold og bedt om en endelig, kundevendt renskrivning, som skal vises før publicering. Den renskrevne visningsversion ligger i [dpa-final-review.md](dpa-final-review.md), version 2026-10-03.review-1. Den bruger Kunden/Databehandleren, samler bilag A–D og indeholder ingen formuleringer som "Axel oplyser", kodehenvisninger eller interne teststatusser.

Godkendelsen er registreret som tekstgodkendelse af det tidligere arbejdsgrundlag. Den dokumenterer ikke færdig leverandørkontrol eller produktionsdrift. Ingen kundeaccept, underskrift, publicering, ændring af immutable JSON, migrationsseed, commit, push eller deployment er udført i dette trin. Den nye tekst skal kunne gennemlæses før en publiceringshandling.

## Hvad er ændret i teksten

- Arbejdsnoter er flyttet ud af aftalen. Minimumssikkerhed og opbevaring er formuleret som kontraktlige forpligtelser frem for påstande om certificeret eller færdig produktionsdrift.
- Kundens juridiske identitet knyttes til den konkrete tjenesteaftale/acceptregistrering. Min Kreative Verden er ikke indsat som kontraktpart uden juridisk identitets- og fuldmagtskontrol.
- Instruksbegrænsning, fortrolighed, rettigheder, brud, assistance, kontrol og ophør står samlet i hovedaftalen. Lovkrævet behandling/underretning og underdatabehandleransvar er gjort udtrykkelige.
- Bilag A beskriver data, personer, AI, leads, funktioner og kundevalgte modtagere. Bilag B beskriver minimumssikkerhed. Bilag D indeholder de godkendte 30/90/30-perioder og ophørsinstruksen.
- Bilag C beskriver de identificerede leverandører og kræver konkret aftale-/overførselsdækning før behandling. Det foregiver ikke, at alle modtagere, lande, planer og sletteforhold er verificeret.

## Fortsat før publicering til kundeaccept

Aftaleteksten er renskrevet, men pakken er ikke færdig til kundeaccept, før især bilag C er komplet. Flytning af arbejdsnoter ud af kontrakten må ikke skjule disse forhold:

1. Afstem kontoernes juridiske kontraktparter og relevante underleverandører; udfyld faktisk land-/modtager-/overførselsgrundlag. En dynamisk liste og en valgt EU-database er ikke tilstrækkelig dokumentation for konkrete videreoverførsler. Resends DPF-status må ikke behandles som verificeret.
2. Vercel Hobby dækker efter den aktuelle offentlige DPA ikke det samme aftalegrundlag som Pro/Enterprise. Afklaringen er fortsat parkeret; ingen opgradering foretages som følge af renskrivningen.
3. Afstem leverandørkopier og sletning for én tenant. OpenAI/Resends generelle opbevaringsvilkår må ikke behandles som automatisk opfyldelse af Kundens sletteinstruks.
4. Gennemfør nødvendige produktionsmigrations, cron-/alarmkontrol, adgang/MFA, backuprotation og ophørsbegrænsning før den lovede drift. De lokale tests dækker ikke dette. Gendannelsestesten er fortsat parkeret.
5. Registrer Kundens identitet, kontakt, funktioner, eventuelle afvigende perioder og konkrete overførselsinstruks ved aftaleindgåelse. Den generiske renskrivning er ingen kundes underskrevne aftale.
6. Ved efterfølgende publicering anvendes ny version, fuldt dokumentarkiv og hash samt ny migration efter eksisterende procedure; ingen historiske dokumenter ændres, og tidligere kunder får ikke automatisk accept.

## Kildekontrol

De grundlæggende kontraktpunkter er kontrolleret mod Datatilsynets materiale om [databehandleraftaler og standardkontraktsbestemmelser](https://www.datatilsynet.dk/presse-og-nyheder/nyhedsarkiv/2021/okt/databehandleraftale-skal-jeg-bruge-dansk-skabelon-eller-eu-standardkontraktbestemmelser). Dokumentet er en individuelt udformet aftale; det fremstilles ikke som Datatilsynets uændrede standardskabelon eller som godkendt af tilsynet.

Leverandørnavne og aftaler er genkontrolleret 3. oktober 2026: [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [OpenAI DPA](https://openai.com/policies/data-processing-addendum/), [Resend DPA](https://resend.com/legal/dpa) og [Vercel DPA](https://vercel.com/legal/dpa). Vercels offentlige aftale omfatter Pro/Enterprise. Offentlige vilkår erstatter ikke konto- og overførselskontrol.

Se [DPA-status](dpa-readiness.md), [leverandørarbejdsbilag](dpa-supplier-annex.md) og [lokal browserverifikation](privacy-browser-verification.md) for konkret evidens og øvrige åbne punkter.

## Efterfølgende publiceringsinstruks

Axel har gennemlæst teksten, bedt om at fjerne CVR-linjen og derefter udtrykkeligt bedt om publicering på EmbedBots /dpa. Version 2026-10-03.1 forberedes som offentlig læseversion med fuld tekst og hash i lib/compliance/dpa-publication.json. Kunden kan læse teksten; kundeaccept er fortsat lukket, og dette trin registrerer ingen aftaleindgåelse eller gennemfører produktionsmigration. Historisk legal-documents.json og migrationsarkiver ændres ikke.
