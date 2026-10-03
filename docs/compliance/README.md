# EmbedBot compliance — aktuel implementation

Status: implementation 2.–3. oktober 2026. Axel har efter gennemgangen bedt om commit og push af ændringerne. Produktionsmigration og ændringer af produktionsdata er ikke udført. Dette er teknisk dokumentation og udkast, ikke en erklæring om juridisk compliance.

- [Implementations- og verificeringsrapport](implementation-report.md)
- [Manuelle handlinger](MANUAL-ACTIONS.md)
- [Aftalepart og kontaktdata — bekræftet af Axel](contracting-party.md)
- [Databehandleraftale — arbejdskopi til færdiggørelse](dpa-working-draft.md)
- [DPA — samlet leverandørbilag](dpa-supplier-annex.md)
- [DPA — konkret status før kundeaccept](dpa-readiness.md)
- [Kundeophør — praktisk procedure](customer-offboarding.md)
- [Isoleret privatlivstest — resultat og begrænsninger](privacy-browser-verification.md)
- [Supplerende leverandørkontrol](additional-supplier-review.md)
- [Behandlingsfortegnelse](processing-register.md)
- [Retention og datamodel](retention.md)
- [Sikkerhed](security.md)
- [Beredskab](incident-response.md)
- [Registreredes rettigheder](data-subject-requests.md)
- [AI-kompetencer](ai-literacy.md)
- [Risikoscreening](risk-screening.md)

Offentlige sider: `/privacy`, `/cookies`, `/terms`, `/dpa` (udkast), `/subprocessors`. Dashboard: **Privatliv & sikkerhed**. Fælles leverandørkilde: `lib/compliance/suppliers.ts`. Uforanderlige dokumentversioner: `lib/compliance/legal-documents.json`, arkiveret med indholdshash i migrations.

Migrations i rækkefølge: `supabase/migrations/20261002183142_compliance_phase_1_2.sql`, derefter `supabase/migrations/20261003072702_agreed_trial_end.sql`, oprettet med Supabase CLI. Anvend kun efter schema-/miljøkontrol og separat godkendelse til produktion. Nye serverflows kræver migrationen; DPA bliver ikke accepterbar ved migrationen. Eksisterende kunder får ingen falske acceptrecords.

Prøveregel bekræftet direkte af Axel: 14 dage uden kort; ingen automatisk overgang til betaling. Axel præciserede 3. oktober: automatisk afslutning kræver en aftalt slutdato; ellers fortsætter prøveadgangen. Betalte abonnementer købes aktivt og fornyes efter deres betalte vilkår. Ingen eksisterende Stripe-konfiguration er ændret.
