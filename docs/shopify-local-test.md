# Lokal Shopify-test

Denne vejledning beskriver den lokale Shopify-test, afprøvet 5. oktober 2026. Selve testadgangen er slået fra i produktion, også når koden bliver udgivet.

## Åbn testen

- Integrationer: http://localhost:3000/dashboard?view=integrations
- Chat: http://localhost:3000/preview/a2678b5f-6d8b-415f-bbc0-ef3ce2a148bc
- Testbutik: `embedbot-test.myshopify.com`

Den eksisterende udviklingsserver kører på port 3000. Ved næste opstart bruges `npm run dev`.

## Lager: afprøvet med rigtige Shopify-data

Skriv disse spørgsmål i chatten:

1. “Er The Complete Snowboard på lager i farven Ice?” — varianten vælges, pris 699,95 USD og lager 10 stk.
2. “Er The Out of Stock Snowboard på lager?” — udsolgt, 0 stk.
3. “Er The Inventory Not Tracked Snowboard på lager?” — lagerstatus ikke bekræftet.

Ice blev midlertidigt ændret fra 10 til 9 i Shopify. Chatten viste 9. Lageret blev derefter gendannet til 10. Produktopslag kan være cachet i op til 30 sekunder.

Direkte danske/engelske lagerspørgsmål hentes uden AI-klassificering. Mere almindelig samtale og åbne produktsøgninger kræver en gyldig lokal `OPENAI_API_KEY`. Den nuværende lokale nøgle afvises af OpenAI; nøgler skal indtastes lokalt, ikke i chatten.

## Ordre: testdata klar, Shopify-adgang mangler

Testordre **#1001** blev oprettet i testbutikken til **axel@embedbot.dk** med linjen “EmbedBot lokal integrationstest”, total 0 USD og status ikke-klargjort. Ingen betaling eller rigtig forsendelse blev gennemført.

Skriv “Hvor er min ordre?” og brug ordrenummeret og mailadressen. Chatten viser en formular og kræver derefter en engangskode. Shopify afviser endnu ordreopslaget med `ACCESS_DENIED`: appen er ikke godkendt til `Order`-objektet. Derfor kom ingen engangskode i denne live-test, og ordrestatus/tracking er endnu ikke verificeret i browseren. En forkert kode afslørede ingen ordredata.

Den nødvendige indstilling er fundet her:
https://partners.shopify.com/5230936/apps/431401009153/customer_data

“Kundeservice” under beskyttede kundedata er forberedt, men ikke gemt. Efter brugerens godkendelse skal ordredata og **Mail** vælges med kundeservice som årsag. Navn, telefon og adresse er ikke nødvendige. Shopify beskriver, at de valgte data kan testes på en udviklingsbutik uden at indsende til review:
https://shopify.dev/docs/apps/launch/protected-customer-data

Efter adgang er gemt:

1. Tryk “Test forbindelsen” i det lokale dashboard.
2. Anmod om engangskode til #1001 i chatten.
3. Kontrollér, at en forkert kode afvises, og den rigtige kode viser den aktuelle status uden kontaktoplysninger.
4. Klargør kun testordren med tydelige test-trackingoplysninger, og gentag et verificeret opslag for at afprøve opdateret status.

## Afgrænsning af lokal adgang

Den ignorerede `.env.local` indeholder disse ufølsomme valg:

```dotenv
NEXT_PUBLIC_SHOP_CONNECTIONS_VISIBLE=true
SHOPIFY_LOCAL_TEST_DOMAIN=embedbot-test.myshopify.com
SHOPIFY_LOCAL_TEST_BUSINESS_ID=a2678b5f-6d8b-415f-bbc0-ef3ce2a148bc
```

Derudover bruges de eksisterende servernøgler til Shopify og Supabase. Den lokale adgang kræver `NODE_ENV=development`, præcis testbot, matchende gemt Shopify-domæne og en eksisterende forbindelse. Shopify client credentials fungerer kun for app/butik i samme organisation. Tokenet holdes i hukommelsen, fornyes før udløb og skal udelukkende have læseadgang, herunder `read_products`, `read_inventory` og `read_orders`.

Den gemte OAuth-forbindelse, krypterede credentials, revision, status og testtidspunkt erstattes ikke i denne tilstand. Afbryd/ny forbindelse blokeres. Den eksisterende `COMMERCE_ENCRYPTION_KEY` er ikke ændret. En udviklingsnøgle til lokale verificeringer afledes med et særskilt formål af den eksisterende serverhemmelighed, hvis commerce-nøglen mangler. I produktion er hele den lokale adgang slået fra.

Den lokale server bruger den eksisterende database. Chat- og rate-limit-registreringer og lokale verificeringsforsøg kan derfor gemmes for testbotten. Testordren og testkunden ligger i Shopify-testbutikken.

## Kontrol

- Hele testsættet: 125 bestået, 1 eksisterende valgfri test sprunget over.
- Typekontrol og lint af ændrede filer bestået.
- Lokalt produktionsbuild (`npm run build -- --webpack`) bestået. Buildet er ikke deployet.
- Automatiserede HTTP-tests kontrollerer bl.a. ejeradgang, engangskoder, isolation mellem bot/session, at lokal test ikke overskriver gemt integration, og at den lokale tokenadgang er slået fra i produktion.
- Browserkontrol foretaget i Chrome med lokale sider og den rigtige testbutik.
