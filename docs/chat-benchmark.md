# Test chatbotens svartid

Åbn `/chat-benchmark.html` på den version af EmbedBot, du vil teste. Lokalt er
adressen `http://localhost:3000/chat-benchmark.html`, når appen kører. Siden
bliver tilgængelig på den offentlige adresse, når ændringerne er deployet.

1. Indsæt chatbot-id’et fra embed-koden eller hele widget-linket.
2. Kontrollér API-adressen. Et widget-link vælger automatisk samme app som linket.
3. Skriv ét spørgsmål pr. linje, og vælg antal gentagelser.
4. Tryk **Start test**, og download CSV eller JSON, når testen er færdig.

Et navn som “Gammel version” eller “Ny version” gemmes i JSON-resultatet. Siden
gemmer ikke resultaterne i browserens lager; download dem før genindlæsning.
Chatbotten skal være aktiv. Ingen OpenAI-nøgle eller administratornøgle kræves.

## Målingerne

- **Første svartekst:** tid fra kaldet starter til den første ikke-tomme svartekst
  modtages. Statusbeskeder som “tænker…” og private samtalereferencer tælles ikke.
- **Afsluttet svar:** tid til hele svarstrømmen er lukket, inklusive serverens
  afsluttende arbejde. Det kan være lidt senere end sidste synlige tekst.
- Gennemsnit, median og min./maks. beregnes pr. prompt fra vellykkede målte kald.
  JSON indeholder også p95 efter nearest-rank-metoden. Med kun fem målinger er
  p95 lig maksimum og bør ikke bruges som en stabil vurdering af spidsbelastning.
- Fejl, tomme svar, timeout og opvarmningskald holdes uden for gennemsnittene.
  Individuelle resultater og svar gemmes, så du kan kontrollere svarenes kvalitet.
- Hvert kald får en ny session og tom historik. Prompts køres på skift gennem
  runderne med ét kald ad gangen. Dette er en svartidstest, ikke en belastningstest.
- JSON angiver svartypen. Produkt- og supportformularer kan svare hurtigere end
  genereret tekst; kontrollér typerne, når du sammenligner to målinger.

Standardtesten har fem prompts med fem gentagelser: 25 kald. Alle kald,
inklusive opvarmning, tæller med i chatbotens normale forbrug og beskedgrænse.
Programmet begrænser en test til 50 kald, men tidligere beskeder samme dag kan
betyde, at serveren stopper testen tidligere. Der omgås ingen grænser. Ved
rate-limit, opbrugt månedsforbrug eller konfigurationsfejl stopper testen og
bevarer de målinger, der allerede er gennemført.

Brug samme chatbot, prompts, enhed og netværk, når du sammenligner versioner.
Opvarmning kan fravælges eller udelades fra statistikken. Første kald er ikke
nødvendigvis en ægte koldstart; serverens og leverandørens cachetilstand styres
ikke af testprogrammet. Målingerne dækker API'et og netværket, ikke widgetens
visuelle rendering. Der måles ingen tokenforbrug, som chat-endpointet ikke udleverer.

## Kør fra terminalen

```sh
npm run benchmark:chat -- --business-id CHATBOT_ID --label "Ny version"
```

Egne prompts kan læses fra en tekstfil med én prompt pr. linje eller et
JSON-array af tekster:

```sh
npm run benchmark:chat -- --business-id CHATBOT_ID --endpoint http://localhost:3000 --prompts prompts.txt --runs 5 --warmups 1
```

`npm run benchmark:chat -- --help` viser alle indstillinger. JSON og CSV gemmes
som standard i `.benchmarks/`, som er udeladt fra Git. `--out` vælger en anden
filsti uden filtype. Ctrl+C stopper testen og gemmer de gennemførte målinger.
CSV beskytter prompt- og svarfelter mod at blive udført som regnearksformler.

Målelogikken og brugerfladen bruger samme modul. Automatiske tests bruger en
lokal HTTP-server og kontrollerede streams; de sender ikke kald til den rigtige
chatbot og bruger ikke dens kvote.
