# EmbedBot legal and accessibility checklist

Reviewed against the 20-point screenshot on 17 September 2026. This is an engineering/compliance review, not a guarantee against claims or a substitute for advice from a Danish lawyer.

## Outcome

| # | Area | Status after this review | Evidence or action |
|---:|---|---|---|
| 1 | Privacy policy | Implemented | `/privacy` describes data, purposes, legal bases, processors, transfers, retention, rights and contact details. |
| 2 | Terms of service | Implemented, legal review recommended | `/terms` was rewritten for a B2B SaaS service, including AI limitations, acceptable use, data roles, renewal, termination and liability. |
| 3 | Refund policy | Implemented | `/refunds` now explains the free pilot, monthly billing, cancellation and refund handling. |
| 4 | Cookie policy | Implemented | `/cookies` inventories necessary storage, analytics, widget cache, fonts and external icons. |
| 5 | Cookie consent banner | Implemented | Plausible, Vercel Web Analytics and Speed Insights load only after an active “Acceptér analyse” choice. The banner has an equally clear rejection action and the cookie page lets visitors change their choice. |
| 6 | Form consent/notices | Improved | Pilot and support forms now link to the privacy policy. Checkout requires explicit acknowledgement of B2B status, automatic monthly renewal, VAT and legal documents. Login fields are necessary for authentication and do not require a consent checkbox. |
| 7 | Data minimisation | Mostly implemented | The app uses hashed IP data for rate limiting, optional onboarding fields, a 90-day default conversation retention setting and scoped form fields. Verify the production database migration and cleanup schedule. |
| 8 | Third-party SDKs | Audited | OpenAI, Supabase, Stripe, Resend, Vercel, Plausible, Google Fonts and Simple Icons are disclosed. DPAs, transfer mechanisms and production settings still require an owner-side contract review. |
| 9 | Dark patterns | No clear dark pattern found | Cancellation is available in the dashboard, the free pilot does not auto-convert, and the legal acknowledgement is unticked. Keep accept/reject choices equally clear if a consent banner is added. |
| 10 | Hidden fees | Improved | Prices state “exclusive of VAT”; checkout acknowledgement repeats VAT, monthly renewal and cancellation. Enterprise remains individually quoted. |
| 11 | Fake reviews | Not present | No testimonials, star ratings or customer review claims were found in the application. |
| 12 | Unsupported claims | Improved | “Mest valgt” was replaced with “Anbefalet”; the prompt-injection guarantee was removed; the performance FAQ was narrowed to the actual test and its limitations. |
| 13 | Image alt text | Reviewed/improved | Meaningful brand images have names, decorative paired logos use empty alt text, and the widget logo has a descriptive alt. User-uploaded logos still need meaningful business names supplied by the customer. |
| 14 | Colour contrast | Improved, visual test still needed | Widget watermark and metadata colours were darkened and a global focus ring was added. Run an automated browser accessibility scan on the deployed site before release. |
| 15 | Keyboard navigation | Improved | Skip link, visible focus, widget dialog semantics, `aria-expanded`, keyboard send and Escape-to-close are present. A deployed keyboard/screen-reader pass is still required. |
| 16 | Business details | Partly implemented | Name, address, phone and email are in the privacy policy and terms. CVR is not available in the repository and must be added if the business has one. |
| 17 | Children's data/age | Implemented as non-targeting | Terms are 18+ B2B. Privacy and terms prohibit targeting children or relying on children's consent without an appropriate age/parental flow. No age gate was added because the service is not directed to children. |
| 18 | Email unsubscribe | Implemented where relevant | The outbound private-demo marketing email now contains an opt-out link. Transactional activation and account emails do not contain an unsubscribe link because they deliver the requested service. Suppression must be honoured operationally. |
| 19 | Font/image licences | Documented | `THIRD_PARTY_NOTICES.md` records font and icon sources, trademark caveats and unverified unused media. |
| 20 | Data deletion request | Implemented | `/data-requests`, privacy contact routes, authenticated export and deletion APIs exist. Confirm the production database RPCs are installed and test deletion end to end. |

## Required owner decisions and production checks

1. EmbedBot is confirmed as strictly B2B. If consumers may subscribe in the future, checkout, terms, VAT display and withdrawal rights must be redesigned before sale.
2. Add the registered legal business name and CVR number before the first paid customer. Do not invent or publish a number.
3. The site now collects active consent before analytics. The widget's local-storage cache and Google Fonts request occur on customers' own websites; customers need to cover those technologies in their own setup and policies.
4. Verify signed DPAs and international-transfer settings for Supabase, OpenAI, Stripe, Resend and Vercel.
5. Verify `add_gdpr_support.sql` is applied in production and schedule/test `cleanup_expired_conversations()` daily.
6. Maintain an opt-out/suppression list for marketing/demo outreach. A mailto link is only effective if requests are recorded and honoured.
7. Have Danish counsel review the B2B terms, liability cap, data-processing roles and refund policy before launch.

## Primary guidance consulted

- Datatilsynet, cookies and similar technologies: https://www.datatilsynet.dk/regler-og-vejledning/cookies-og-lignende-teknologier
- Datatilsynet, cookies and GDPR for small businesses: https://www.datatilsynet.dk/regler-og-vejledning/gdpr-univers-for-smaa-virksomheder/cookies-og-gdpr
- Forbrugerombudsmanden, disclosure duties: https://forbrugerombudsmanden.dk/alle-emner/forbrugeraftaler/oplysningspligter
- Forbrugerombudsmanden, online subscriptions: https://forbrugerombudsmanden.dk/publikationer/retningslinjer-og-vejledninger/vejledninger-longreads/oplysningskrav-ved-online-salg-af-abonnementer
- Sikkerhedsstyrelsen, accessibility for e-commerce services: https://www.sik.dk/erhverv/produkter/tilgaengelighed-produkter-og-tjenester/tilgaengelighed-e-handelstjenester
- Vercel Web Analytics privacy description: https://vercel.com/docs/analytics
- Supabase SSR auth and cookies: https://supabase.com/docs/guides/auth/server-side
