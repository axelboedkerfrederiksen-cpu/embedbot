# Offentlig dokumentgennemgang — 3. oktober 2026

Leverandørlisten er omskrevet fra generiske pladsholdere til kildebaserede beskrivelser. `supplier-register.json` er den aktuelle offentlige oversigt. Historiske snapshots er bevaret. Kontroltidspunkt erstatter den tidligere ubekræftede tilføjelsesdato; der påstås ikke en leverandørstartdato.

## Afsluttede tekstrettelser

- Juridiske enheder, behandlingsroller, steder og offentliggjorte overførselsmekanismer er udfyldt med links til kilderne nedenfor. OpenAI og Stripe beskrives efter den geografisk betingede standardaftale, uden at en kontoacceptdato opfindes.
- Stripe til EmbedBots abonnementer og Plausible til EmbedBots website er afgrænset fra webshopkundens underdatabehandlerbilag.
- Privatlivspolitikken identificerer Axel Bødker Frederiksen og den tidligere brugerbekræftede adresse/kontakt. OpenAI-datadeling beskrives efter den dokumenterede AI Council-kontrol; ingen ZDR- eller EU-behandlingsgaranti påstås.
- Cookiepolitikken beskriver browserlagring særskilt fra leverandørernes serverbehandling. Gamle interne arbejdskommentarer er fjernet fra de offentlige linktekster.
- Vilkårsversion 2026-10-03.3 indeholder fuld aftalepart og den aktuelle leverandørsnapshot. Priser, prøvevilkår, ansvar og øvrige materielle vilkår ændres ikke i dette arbejde.
- DPA-læseversion 2026-10-03.2 præciserer bilag C med offentliggjorte aftalegrundlag og aktuel hostingstatus. Læseversion 2026-10-03.1 bevares byte-for-byte i `lib/compliance/archive/`.
- Ny migration tilføjer dokumentarkiver med hash. Ingen historiske dokumenter ændres, og ingen kundeaccept oprettes.

## Uafsluttet aftaledækning — ikke skjult som færdig

Axel bekræfter i denne chat, at Vercel stadig er Hobby. Vercels offentlige DPA omfatter Pro/Enterprise, og Hobby er begrænset til personlig, ikke-kommerciel brug. Der er derfor fortsat ikke dokumenteret databehandler-/kommerciel dækning for kundedrift hos den aktuelle host. Ingen opgradering eller køb er autoriseret eller udført her.

DPA-kundeaccept er fortsat lukket. Endelig aftaleindgåelse kræver også konkret overførselsvurdering og bilag, kundens juridiske identifikation samt gennemførelse af de aftalte driftsforanstaltninger. Offentlige SCC-vilkår eller en irsk aftalepart dokumenterer ikke i sig selv en afsluttet overførselsvurdering. Backup-restore og leverandørsletning for én kunde er fortsat udestående efter tidligere driftsnotater. Disse oplysninger må ikke omklassificeres til godkendte blot ved at fjerne ordet udkast.

Den tidligere migration `agreed_trial_end` blev afvist af automatisk godkendelseskontrol i den foregående fejlrettelse. Dette arbejde ændrer ikke prøveperiodens databasefunktion. Det udestående skal afstemmes før kundestart med de allerede offentliggjorte prøvevilkår.

## Officielle kilder kontrolleret

- Supabase: https://supabase.com/legal/customer-resources/data-processing-addendum og https://supabase.com/legal/customer-resources/subprocessor-list
- OpenAI: https://openai.com/policies/data-processing-addendum/ og https://developers.openai.com/api/docs/guides/your-data
- Vercel: https://vercel.com/legal/dpa og https://vercel.com/docs/plans/hobby
- Resend: https://resend.com/legal/dpa, https://resend.com/security/gdpr og https://resend.com/legal/subprocessors
- Stripe: https://stripe.com/dk/legal/ssa og https://stripe.com/legal/dpa
- Plausible: https://plausible.io/imprint og https://plausible.io/privacy

Validering: TypeScript, målrettet lint og 18 compliance-route-tests bestået. Route-tests udføres isoleret uden produktionsdata; de kontrollerer også arkivtekst, hash og lukket DPA-status.
