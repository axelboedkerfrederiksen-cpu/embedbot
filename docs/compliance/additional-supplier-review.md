# Supplerende leverandørkontrol — 3. oktober 2026

## OpenAI — modtagere og lande

[Aktuel liste](https://openai.com/policies/sub-processor-list/), dateret 9. juli 2026, blev læst i browser og på web. Den angiver flere API-infrastrukturleverandører og behandlingssteder inden og uden for EØS, herunder USA. Den angiver også moderation hos relevante leverandører og kundestyret deling ved support. Der kan derfor ikke loves EU-only behandling eller fravær af menneskelig adgang alene ud fra fravalgt træningsdeling. Den præcise routing for AI Council er ikke vist af listen. Affilierede OpenAI-enheder angives med SCC'er; effektiviteten skal vurderes for de relevante overførsler.

## Supabase — aktuel liste

Den aktuelle DPA henviser til [Subprocessor List](https://supabase.com/legal/customer-resources/subprocessor-list), hvor seneste link er mærket 1. juni 2026. Den tidligere antagede /legal/subprocessors-adresse giver 404. Den linkede listes indhold er endnu ikke gennemgået; en ældre DPA-liste må ikke bruges som nutidig modtagerliste. Versionsafstemning med TIA'en fra 2025 udestår.

## Stripe — særskilt betalingsbehandling

[DPA](https://stripe.com/legal/dpa), læst med opdateringsdato 28. september 2026, beskriver både processor- og controllerroller. Betaling, fraud og lovpligtig kontrol har særskilte formål. Den generiske URL omdirigerede til schweizisk lokalvisning; den må ikke anvendes til at udlede den danske kontos kontraktpart. I EmbedBots kode er Stripe knyttet til betaling for EmbedBots abonnementer; det er ikke dokumentation for afsendelse af webshopbesøgendes chats. Kontoens danske vilkår, modtagere og overførsler kræver fortsat kontrol.

## Plausible — EmbedBots eget website

[Imprint](https://plausible.io/imprint) identificerer Plausible Insights OÜ i Estland. [Privacy](https://plausible.io/privacy), opdateret september 2026, skelner besøgsdata behandlet i EU fra kontodata med andre modtagere/overførsler. Besøgsleverandører angives som Hetzner, Bunny og UpCloud. [DPA](https://plausible.io/dpa) findes offentligt; kontoens aftale-/retentionforhold skal afstemmes.

Kodekontrol: app/components/cookie-consent.tsx loader Plausible, Vercel Analytics og Speed Insights efter samtykke på EmbedBots sider. Plausible-request fjerner URL-parametre og referrer. Denne måling er EmbedBots egen websitebehandling, ikke automatisk en del af enhver webshopkundes widgetinstruks. Webshop-widgetflow skal vurderes særskilt; kodekontrollen beviser ikke kontoens data eller deployede indstillinger.

## Leverandørafklaring der kræver svar

Supabase skal afstemmes på gældende kontraktpart, TIA-version, relevante modtagere/lande og supportadgang for Frankfurt-projektet. OpenAI skal afstemmes på AI Council-projektets behandlingssteder, relevante videreoverførsler/moderation, kontopart og sletteassistance uden at lukke hele leverandørkontoen. Resend kræver tilsvarende afklaring om sletning af én kundes beskeder og forskellen mellem den aktuelle DPA og dashboardets underskrevne PDF.

Der er ikke sendt leverandørhenvendelser eller accepteret aftaler. Dette er indhentet dokumentation og åbne spørgsmål, ikke en afsluttet positiv overførselsvurdering.
