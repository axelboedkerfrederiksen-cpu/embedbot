# EmbedBot 2.0 · Webshopdata og supportsager

Denne version udvider den eksisterende chatbot, widget og dashboard. Shopify og WooCommerce er de første understøttede platforme. Et vilkårligt website får ikke automatisk adgang til produkt-, lager- eller ordredata; specialbyggede webshops kræver en adapter og et aftalt API.

## For webshop-ejere

1. Åbn **Dashboard → Integrationer**, og vælg din platform.
2. Shopify: angiv butikkens `*.myshopify.com`-adresse, og godkend læseadgang hos Shopify.
3. WooCommerce: angiv den offentlige HTTPS-adresse og butikkens valuta. Du sendes til WooCommerce for at godkende **Read**. WooCommerce sender de genererede nøgler direkte til EmbedBots server; de vises ikke i dashboardet.
4. Kontrollér forbindelsesstatus og brug **Test forbindelsen**. Afbryd forbindelsen her, hvis den ikke længere skal bruges. Det sletter EmbedBots lagrede credentials og ugyldiggør tidligere ordreudfordringer. Fjern også appen/nøglen i platformen, hvis dens platformadgang skal tilbagekaldes.
5. Vælg modtagermail til supportnotifikationer. Den er separat fra botens offentlige kontaktmail.
6. Åbn **Supportsager** for at læse kundens henvendelse, se tilvalgt samtalekontekst, ændre status og kontakte kunden via mail.

Kunden gennemser en opsummering og trykker selv **Send henvendelse**. En uverificeret kunde kan oprette en sag, men mailadresse og ordrenummer mærkes som kundeoplysninger, der ikke er verificeret. En sag giver aldrig adgang til ordredata. Botten lover ikke refundering, erstatning eller en svartid uden butikkens eksplicitte konfiguration.

## Serveropsætning

De eksisterende Supabase-, OpenAI-, login- og Resend-indstillinger bruges fortsat. Tilføj følgende serverindstillinger før aktivering:

| Variabel | Betydning |
| --- | --- |
| `COMMERCE_ENCRYPTION_KEY` | Tilfældig 32-byte nøgle kodet som base64; præcis 44 tegn inklusive afsluttende `=`. Kun server. |
| `COMMERCE_EMAIL_FROM` | Verificeret Resend-afsender, fx `EmbedBot <support@dit-domæne.dk>`. |
| `RESEND_API_KEY` | Eksisterende servernøgle til Resend. |
| `SHOPIFY_CLIENT_ID` | Client ID fra Shopify Dev Dashboard. |
| `SHOPIFY_CLIENT_SECRET` | Serverhemmelighed til Shopify OAuth. |
| `NEXT_PUBLIC_APP_URL` | EmbedBots kanoniske offentlige HTTPS-adresse. WooCommerce skal kunne nå callback fra sin server. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Eksisterende serveradgang til databasen. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Eksisterende loginopsætning. |
| `CRON_SECRET` | Hemmelighed til den valgfrie proces for mailgenforsøg og oprydning. |

Generér krypteringsnøglen i dit sikre miljø, fx `openssl rand -base64 32`. Del den aldrig i chat, logs eller `NEXT_PUBLIC_*`-variabler. Gem nøglebackup sikkert: mister du nøglen, må integrationerne forbindes igen. Nøglerotation kræver dekryptering med den gamle nøgle og genkryptering med den nye; det sker ikke automatisk.

Anvend migrationen `supabase/migrations/20261001173453_embedbot_commerce.sql` i en stagingdatabase først. Samme SQL findes i `sql/add_embedbot_commerce.sql` som alternativ til manuel installation; kør kun én af de to. Det eksisterende rate-limit-skema og RPC fra `sql/create_chat_rate_limit.sql` skal også være installeret og hærdet som i projektets eksisterende sikkerhedsmigrationer.

Migrationen opretter fem tabeller samt tre atomare funktioner. Tabellerne har RLS og ingen adgang for `anon`/`authenticated`; service-role-serverruter kontrollerer ejerskab før dashboardadgang. Alle rækker refererer til `businesses` og slettes med botten via `ON DELETE CASCADE`. Der ændres ikke i eksisterende tabeller, login eller betalingsflow.

Manglende databaseopsætning, krypteringsnøgle eller mailopsætning vises tydeligt som ikke konfigureret. Almindelige chatsvar kan fortsætte uden en integration. Ordreverificering fejler lukket uden mail/rate limiting. Supportsager kan gemmes uden mailopsætning.

## Shopify

Der bruges [OAuth authorization code grant for standalone apps](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps) og GraphQL Admin API `2026-10`. Callback-URL:

`https://DIN-EMBEDBOT-ADRESSE/api/commerce/shopify/callback`

Konfigurér præcis denne redirect i Shopify Dev Dashboard. Anmodede scopes er kun `read_products`, `read_inventory`, `read_orders`. Ingen writes eller `read_all_orders`. Shopify begrænser normalt ordreopslag til de seneste 60 dage. E-mailfelter kræver den nødvendige godkendelse af [protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data); scopes alene giver ikke adgang. Produktlinks kræver produkter offentliggjort på onlinebutikken.

Callback validerer serverbundet, krypteret state-cookie, ejerlogin, shopdomæne, HMAC, timestamp og den aktuelle installationsrevision. Koden udveksles med `expiring=1`. Adgangstoken og refresh-token gemmes krypteret; fornyelse sker på serveren under en databaselease, før adgangstoken udløber. Refresh roterer tokenparret. En ugyldig/udløbet refresh kræver ny godkendelse. Se [Shopifys aktuelle tokenvejledning](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens).

Produktpris er butikkens grundvaluta og inkluderer ikke kundespecifikke Markets-priser, rabatkoder eller fragt. Op til 100 varianter hentes pr. produkt; en ufuldstændig liste markeres og bruges ikke til at konkludere, at en variant mangler. Ukendt/ikke-tracket lager er ukendt, ikke automatisk udsolgt. Lager er en registreret mængde, ikke en garanti om køb eller levering.

Appdistribution, godkendelse og Shopifys obligatoriske compliance-/uninstall-webhooks skal konfigureres, før appen udgives som en offentlig Shopify-app. Disse platformwebhooks er ikke inkluderet i denne første version. De lokale forbindelsesflows er implementeret, men udgør ikke i sig selv en færdiggodkendt App Store-app.

## WooCommerce

Der bruges det officielle [authentication endpoint](https://developer.woocommerce.com/docs/apis/rest-api/authentication) med `scope=read`, en engangsnonce og en ti minutters gyldighed. Callback-URL:

`https://DIN-EMBEDBOT-ADRESSE/api/commerce/woocommerce/callback`

WooCommerce sender nøglerne i et server-til-server POST. Callback afviser `write`/`read_write`. Noncen forbruges atomart og er knyttet til botten og installationsrevisionen; en afbrudt eller erstattet opsætning kan ikke genoplives af en gammel callback. Credentials gemmes krypteret før callback kvitteres. En efterfølgende live test kontrollerer produkter, ordrer og valuta, mens dashboardet viser afventende status.

Alle webshopdata læses med GET fra `/wp-json/wc/v3` med Basic Authentication over HTTPS. Nøgler lægges aldrig i query-parametre. Butikkens administrator skal have adgang til produkter, ordrer og generelle indstillinger. WordPress-installationer i en undermappe, specialplugins til ordrenumre og andre særtilpasninger kræver tilpasning af adapteren; denne adapter bruger standardinstallationens origin og numeriske ordrenumre.

WooCommerce core indeholder ikke trackinglinks. Adapteren læser den officielle Shipment Tracking-udvidelses `_wc_shipment_tracking_items`, når metadata findes, og returnerer kun et sikkert faktisk `custom_tracking_link`, trackingnummer og transportør. Der konstrueres aldrig et trackinglink. Hvis udvidelsen ikke er installeret eller data mangler, vises ingen trackingdata. Se [Shipment Tracking](https://woocommerce.com/document/shipment-tracking/).

## Arkitektur og data

- `lib/commerce/types.ts`: fælles `CommerceAdapter`, `ProductQuery`, `Product`, `Variant`, `OrderStatus` og den private `PrivateOrder`.
- `shopify.ts` / `woocommerce.ts`: platformadaptere med `testConnection`, `searchProducts` og serverprivat `lookupOrder`.
- `server.ts`: database, autentificeret ejeradgang, botadgang, sessionbinding og rate limiting.
- `security.ts`: AES-256-GCM med tenant/formålsbinding, HMAC og validering.
- `http.ts`: kun HTTPS, offentlig IP-adresse, DNS-pinning, ingen redirects med credentials, højst 8 sekunder og 1 MB pr. svar.
- `orders.ts`: engangskode og serverkontrolleret ordreopslag.
- `support.ts` / `mail.ts`: bekræftet sag, idempotent databaseindsættelse, maillease og genforsøg.

Credentials ligger kun i serverens krypterede integrationsrækker. De returneres aldrig af dashboard- eller widget-API'er og sendes ikke til modellen eller logs. Produkt- og ordreuddata rendres som tekst og sikre HTTPS-links; platformindhold er ikke instruktioner.

Produkt-/variant-/lagerdata caches højst **30 sekunder** i serverprocessen. Cache er begrænset til 100 opslag og adskilt efter bot, installationsrevision og hele søgningen. Svaret indeholder `fetchedAt` og `cacheSeconds`, og widgetten viser alderen. API-fejl efter udløb giver en fejl/hjælpehenvisning, aldrig en ældre cache som aktuelt resultat. Ordrestatus hentes uden cache ved den verificerede forespørgsel.

Modellen klassificerer spørgsmål og udleder produktsøgning, variant og filtre. Serveren vælger adapteren. Private ordreoplysninger, engangskoder og ordreformularer kommer aldrig ind i modelværktøjer eller samtalehistorikken. Modellen har ingen funktion, der kan omgå verifikationen eller bekræfte indsendelse af en supportsag.

### Ordreverificering

Ordrenummer og mail er kun et indledende matchfilter. Ordredata afsløres først efter kodebekræftelse.

1. Serveren gemmer en udfordring og returnerer en neutral besked med samme format uden at vente på ordre-/mailopslaget.
2. Arbejdet efter svaret slår ordren op og sender koden til mailadressen **fra platformens ordre**, hvis match og adgang er gyldige. Ingen match/API-fejl/mailfejl giver ingen offentligt afslørende status.
3. Koden er seks cifre, udløber efter ti minutter og har fem forsøg. Kun en server-HMAC gemmes. Ordrelokator gemmes krypteret.
4. En atomar databasefunktion kontrollerer bot, hash af browser-Origin og tilfældig chat-session, integrationsrevision, forsøg og udløb. Koden forbruges én gang; lokatoren fjernes fra rækken.
5. Serveren henter status igen og returnerer kun fulfillment-status og eksisterende trackingdata. Ingen adresse, e-mail, betalingsdata eller ordrevarelinjer.

Hver godkendelse giver ét statusopslag for den konkrete ordre i den konkrete session. Et nyt opslag kræver en ny kode. Widgetsessionen ligger kun i hukommelsen og nulstilles ved genindlæsning. Der indgår ingen eksisterende webshopkundesession i denne version.

Rate limits er atomare i den eksisterende database-RPC og fejler lukket: ordre-API højst 15 forsøg/15 minutter pr. bot/IP, kodeanmodninger højst 5/15 minutter pr. bot/IP og 3/15 minutter pr. bot/mail. Rate-key bruger server-HMAC. Deployment skal bruge en betroet proxy, som kontrollerer IP-headers.

### Supportsager og notifikationer

`prepare` returnerer en krypteret, sessionbundet opsummering, der udløber efter 30 minutter. Intet sendes eller oprettes på dette trin. `confirm` kræver både opsummeringstoken og `confirmed: true`; formularen har en separat bekræftelsesknap. Payload kan ikke ændres ved bekræftelsen.

Sagen indeholder bot, sagsnummer `EB-…`, tidspunkt, kontaktmail, valgfrit ordrenummer, beskrivelse, tilvalgt og begrænset samtalekontekst samt status (`new`, `in_progress`, `closed`). Identiske beskrivelser/mail/ordrenummer i samme chat er idempotente og returnerer samme sagsnummer. Databaseunique + `ON CONFLICT DO NOTHING` beskytter også samtidige indsendelser. Rate limits er 15 supportkald/time pr. bot/IP samt 5 nye sager/time pr. bot/IP og bot/mail. Widgetten har desuden et honeypotfelt og låser afsendelsesknappen under indsendelse.

Sagen gemmes **før** mailafsendelse. Mailfejl kan ikke slette den. Notifikationsmodtageren fastlåses på sagen, så genforsøg har samme mailpayload. Mangler modtager/afsender/Resend-nøgle, er status `not_configured`.

En databaselease og Resends deterministiske idempotency key beskytter mod dobbelte mails. Status `sent` betyder **accepteret af mailudbyderen**, ikke dokumenteret levering til indbakken. Der er ingen Resend-delivery-webhook i denne version. Maksimalt fem forsøg og genforsøg inden 23 timer fra første forsøg, så automatiske genforsøg stopper før [Resends 24 timers deduplicering](https://resend.com/docs/dashboard/emails/idempotency-keys) udløber. Derefter kontrolleres udbyderstatus manuelt; serveren sender ikke automatisk igen.

Ejeren kan prøve en fejlet notifikation igen fra sagen. Valgfri automatisk behandling: kald `GET /api/cron/support` med `Authorization: Bearer CRON_SECRET`, fx hvert femte minut fra en betroet scheduler. Endpointet behandler højst 50 rækker og rydder udløbne engangskoder/forbindelsesforsøg op. Der er **ikke** ændret i den eksisterende cronplan. En sag uden en oprindelig modtagermail gemmes i dashboardet og kræver manuel opfølgning; ændret modtagerkonfiguration omskriver ikke tidligere mailpayloads.

Sager bevares indtil bot/konto slettes. En særskilt aldersbaseret retentionpolitik er ikke konfigureret i denne version. Undlad personfølsomme oplysninger i beskrivelse/kontekst. Billedvedhæftninger og svar fra dashboardet er ikke inkluderet.

## Fælles API-format til specialbyggede webshops

Dette er en **kontrakt til en senere adapter**, ikke en automatisk aktiveret integration. Serveren skal implementere `CommerceAdapter` og bruge samme credential-, tenant-, OTP- og rate-limit-lag. En webshop kan implementere disse HTTPS-endpoints med et tenantbundet læse-only Bearer-token:

| Endpoint | Forventet svar |
| --- | --- |
| `GET /embedbot/v1/health` | `{ "version": 1, "capabilities": ["products", "inventory", "orders", "tracking"] }` med kun faktisk understøttede capabilities. |
| `GET /embedbot/v1/products?query=…&minPrice=…&maxPrice=…&currency=…` | `ProductResult` med decimalpriser, ISO-valuta, produkt-/variant-ID og lager; pagineringsbegrænsninger skal fremgå af `more`/`variantsComplete`. |
| `POST /embedbot/v1/orders/lookup` | Body: `{ "number": "123", "email": "kunde@example.com" }`. Serverprivat `PrivateOrder` ved entydigt match, ellers `null`. Ingen writes; POST undgår persondata i URL/logs. |

Eksempel på produktformat:

```json
{
  "products": [{
    "id": "shirt-1",
    "name": "T-shirt",
    "description": "Bomuld",
    "url": "https://butik.example/products/shirt-1",
    "price": "199.00",
    "currency": "DKK",
    "available": true,
    "stock": 4,
    "variantsComplete": true,
    "variants": [{
      "id": "shirt-1-m",
      "name": "M",
      "options": [{ "name": "Size", "value": "M" }],
      "price": "199.00",
      "currency": "DKK",
      "available": true,
      "stock": 4
    }]
  }],
  "more": false
}
```

Eksempel på **serverprivat** ordreformat:

```json
{
  "contactEmail": "kunde@example.com",
  "status": "FULFILLED",
  "shipments": [{
    "shippedAt": "2026-10-01T10:00:00Z",
    "trackingUrl": "https://transportor.example/track/123",
    "trackingNumber": "123",
    "carrier": "Transportør"
  }]
}
```

Ukendt pris/lager/tracking angives med `null`, aldrig med gættede værdier. `contactEmail` skal komme fra den faktisk matchede ordre. API'et skal kun være tilgængeligt for EmbedBots autoriserede server, og matchfilteret er ikke kundeverifikation. Adapteren skal fjerne `contactEmail`, inden den verificerede widget får svaret. Ingen private adresser/betalingsoplysninger er nødvendige. HTTP 401/403/429/5xx behandles som utilgængelig integration og tilbydes support.

## Test og produktionsaktivering

Kør `npm test`, `npm run lint`, `npx tsc --noEmit` og `npm run build`. Tests bruger en isoleret PGlite/PostgreSQL-database med migrations-SQL og mocks for Supabase-transport, Shopify, WooCommerce og Resend. De indeholder HTTP-handlerflows for eksplicit supportbekræftelse, mailfejl/duplikater, OTP, ejeradgang, CSRF, WooCommerce-callback og rate limiting; unit-/databasetests dækker udløb, forsøg, engangsforbrug, kryptering, tenant/session/revision, cache, refresh og RLS/grants. Ingen produktionstabeller, mails eller webshops bruges af tests.

**Rigtige webshops:** Ingen Shopify- eller WooCommerce-butik er live-testet under denne implementering. Ingen simuleret integration vises som aktiv i dashboardforhåndsvisningen. Browserkontrol bruger isolerede mocks.

Før produktion skal databaseopsætningen anvendes, miljøvariablerne konfigureres, afsenderdomænet verificeres, Shopify-app/scopes/kundedata godkendes, WooCommerce-callback være tilgængelig, og begge adaptere prøves mod rigtige stagingbutikker med kendte produkter/varianter/ordrer. Bekræft mails, OTP og ordrestatus samt API-/mailfejl og genforsøg. Konfigurér scheduler, hvis automatiske genforsøg ønskes. Appen understøtter ikke annullering, refundering, ordreændring, filvedhæftning eller automatisk kundesession-verifikation i denne version.
