# Leverandørbilag til DPA — samlet gennemgangsversion

Dato: 3. oktober 2026. Bilaget er arbejdsgrundlag til endelig aftale og er ikke en kundeaccept. Offentlige leverandørvilkår, kontokontrol og åbne spørgsmål er adskilt nedenfor. Ingen leverandør er automatisk godkendt af kunden ved udarbejdelsen.

| Leverandør / juridisk enhed | Behandling på kundens vegne | Sted og overførselsgrundlag | Kontrol og udestående |
| --- | --- | --- | --- |
| Supabase / Supabase Pte. Ltd. i den aktuelle offentlige DPA | Database og Auth: chat, tickets, viden, virksomhedsdata og krypterede integrationer | Projektets database: Frankfurt, eu-central-1. DPA beskriver SCC'er efter relevant rolle. Support/videreoverførsler omfatter yderligere afklaring. | Free og generel DPA-dækning kontrolleret i dashboard. Ældre TIA nævner andre enheder; afstemning af aktuelle modtagere/lande og overførselsvurdering udestår. |
| OpenAI / OpenAI Ireland Ltd. efter offentlige vilkår for EØS-kunder; registrerede kontodata skal afstemmes | API-svar, klassifikation og embeddings med chat/kildeindhold | Europæisk behandling er ikke verificeret. DPA beskriver grundlag for videreoverførsler; konkret behandling og modtagere skal afstemmes. | API-nøglen er ifølge Axel i AI Council. Træningsdeling og organisations-API-logning er Disabled; dette dokumenterer ikke Zero Data Retention. |
| Resend / Plus Five Five, Inc. | Transaktionsmail, supportnotifikationer og verifikationskoder | Maildata lagres i USA. Leverandøren beskriver SCC-modul 2/3 og DPF; aktuel certificering/konkret vurdering udestår. | DPA-dækning bekræftet via kontosiden. embedbot.dk er Verified, afsender Irland, Enforced TLS aktiveret. Afsenderregion er ikke lagringsregion. |
| Vercel / Vercel Inc. i offentlig DPA | Hosting/serverbehandling, levering, jobs og relevante målinger | Faktiske regioner, logs, videreoverførsler og overførselsgrundlag skal kontrolleres | Hobby verificeret. Aktuel DPA er afgrænset til Pro/Enterprise, og Hobby til ikke-kommerciel brug. Axel har parkeret afklaringen til før kundestart. |

Kundens Shopify/WooCommerce er en kundevalgt datakilde ved aktiv integration. Privat ordrestatus behandles efter separat verifikation. Kundens supportindbakke og egne CSV-eksporter er kundevalgte modtagere/kopier og skal omfattes af kundens egne instrukser og sletteprocedurer.

Stripe for EmbedBots abonnementer og eventuel Plausible/Vercel-analyse skal rolle- og flowafgrænses særskilt. De må hverken uden videre optages som underdatabehandlere for alle webshopdata eller udelades fra den samlede persondatakortlægning. Deres aktuelle kontoforhold og behandling er ikke afsluttet i dette review.

## Opbevaring og kopier

EmbedBots godkendte aftaleudgangspunkt er chat/afledt leadoversigt 30 dage, supportsager 90 dage og egne backups højst 30 dage. Ved ophør højst 30 dage til nødvendig eksport og sletning, med tidligere sletning efter kundens instruks. Det er ikke dokumentation for aktuel produktionsdrift.

Leverandørkopier følger separate verificerede vilkår. OpenAI beskriver normalt op til 30 dages abuse-monitoring-opbevaring. Resend beskriver mail/logdata 30 dage på Free/Pro/Scale, backup syv dage og resterende data inden 90 dage efter kontoophør. En enkelt webshopkundes ophør er ikke det samme som lukning af Axels leverandørkonto. Tenant-specifik sletning og assistance skal derfor kortlægges særskilt.

## Dokumentation

Supplerende konto-/rolleafgrænsning og aktuelle modtagerlister: [yderligere leverandørkontrol](additional-supplier-review.md). Listerne viser mulige behandlingssteder, ikke den konkrete routing for hver forespørgsel.

- [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum) og [lokal kontrol](supabase-review.md).
- [OpenAI DPA](https://openai.com/policies/data-processing-addendum/), [datakontroller](https://developers.openai.com/api/docs/guides/your-data) og [lokal kontrol](openai-review.md).
- [Resend DPA](https://resend.com/legal/dpa), [GDPR-oplysninger](https://resend.com/security/gdpr), [underdatabehandlere](https://resend.com/legal/subprocessors) og [lokal kontrol](resend-review.md).
- [Vercel DPA](https://vercel.com/legal/dpa), [Hobby-vilkår](https://vercel.com/docs/plans/hobby) og [lokal kontrol](vercel-review.md).

## Instruks ved internationale overførsler

Den endelige kundeaftale skal identificere faktiske modtagere, lande, formål og relevant overførselsgrundlag. Nye overførsler kræver dokumenteret instruks og lovligt grundlag. En leverandørs generelle GDPR-udsagn eller en valgt EU-region erstatter ikke denne kontrol. Der loves derfor ikke udelukkende EU-behandling i denne version.
