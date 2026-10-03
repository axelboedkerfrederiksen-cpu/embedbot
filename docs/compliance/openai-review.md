# OpenAI — foreløbig leverandørkontrol

Kontrolleret 3. oktober 2026. Arbejdsnotat; kontospecifik aftale og indstillinger er endnu ikke bekræftet.

## Brug i EmbedBot

Den tidligere kodegennemgang viser direkte OpenAI API-kald til chat/klassifikation og embeddings. Chat kan indeholde brugerens aktuelle besked, samtalehistorik og webshopindhold. Begrænset maskering nogle steder betyder ikke, at alle personoplysninger fjernes før afsendelse. Se embedbot-1-0-capabilities.md.

## Offentligt aftalegrundlag

[OpenAI DPA](https://openai.com/policies/data-processing-addendum/) er opdateret 1. december 2025 med virkning fra 1. januar 2026 og indgår i Services Agreement. Dokumentet angiver OpenAI Ireland Ltd. for kunder i EØS/Schweiz og beskriver OpenAI som databehandler for Customer Data. Det beskriver også overførselsgrundlag, herunder SCC'er. Dette er generelle aftalevilkår; EmbedBots faktiske kontoejer, land, aftalehistorik og eventuelle særvilkår skal stadig fastslås.

## Databrug og opbevaring

[API-datakontroller](https://developers.openai.com/api/docs/guides/your-data) angiver, at API-data som udgangspunkt ikke bruges til modeltræning, medmindre kunden aktivt tilvælger deling. Dokumentationen angiver normalt op til 30 dages abuse-monitoring-opbevaring, også for embeddings. Dette er adskilt fra EmbedBots egen databaseopbevaring. Kontospecifik datadeling, opbevaringsundtagelser, Zero Data Retention og eventuel europæisk behandling er ikke verificeret. Europæisk behandling må ikke udledes alene af en dansk konto eller den irske aftalepart.

## Næste kontrol

Axel bekræfter i chatten den 3. oktober 2026, at API-kontoen er oprettet personligt af ham med axel.boedker.frederiksen@gmail.com. Registreret land, organisation/projekt og faktiske datakontroller er endnu ikke verificeret i dashboardet.

- Bekræft API-kontoens ejer og registrerede land/aftalepart.
- Kontroller faktisk datadeling og projektets datakontroller.
- Afstem relevante underdatabehandlere og overførselsvurdering med EmbedBots DPA-arbejdskopi.

Ingen indstillinger, aftaler eller abonnementer er ændret.

## Læsekontrol i dashboardet

Axel bekræfter efterfølgende, at EmbedBots API-nøgle tilhører AI Council. Personal-kontrollen nedenfor er derfor baggrundsoplysning og dækker ikke EmbedBot.

AI Council blev derefter kontrolleret i den indloggede browser den 3. oktober 2026:

- Data controls → Sharing: feedbackdeling Disabled; evaluation/fine-tuning-deling Disabled; API-input/output-deling Disabled. Ingen aktiv tilvalgt træningsdeling blev vist.
- Data controls → Data retention: API call logging Disabled. Dette vedrører organisationsadgang til loggede API-kald og er ikke dokumentation for Zero Data Retention eller fravær af OpenAI abuse-monitoring-logning.
- Audit logging viser mulighed for Enable audit logging; funktionen er ikke aktiveret under kontrollen.

Ingen indstillinger blev ændret. Kontrollen af aktuel datadeling for den af Axel identificerede organisation er gennemført. Aftalepart/land, eventuelle særvilkår, overførselsvurdering og underdatabehandlere udestår stadig; den samlede leverandørkontrol er ikke afsluttet.

Den indloggede konto viser den oplyste Gmail-adresse og to organisationer: AI Council og Personal. Personal → Data controls → Sharing blev læst: feedbackdeling, evaluation/fine-tuning-deling og deling af API-input/output står alle Disabled. Dette dokumenterer alene Personal-organisationens aktuelle indstillinger. Det er endnu ikke fastslået, hvilken organisation EmbedBots API-nøgle tilhører; kontrollen må derfor ikke bruges som bevis for EmbedBots datadeling endnu. Der blev ikke trykket Save eller ændret datakontroller.
