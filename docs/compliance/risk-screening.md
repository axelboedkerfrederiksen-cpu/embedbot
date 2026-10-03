# AI- og DPIA-risikoscreening

Skabelon for hver ny feature, større ændring eller ny leverandør. Dette hjælper med at finde behov for menneskelig vurdering; det beslutter **ikke**, om en DPIA eller en bestemt AI Act-klassifikation juridisk er nødvendig.

Feature / ejer / dato / version:
Formål, reelt brugerproblem og alternativ med mindre data:
Dataflow, systemer, tenants, modtagere og lande:
EmbedBots og kundens forventede roller (kræver review):

| Spørgsmål | Ja / nej / ukendt | Evidens, konsekvens og reviewer |
|---|---|---|
| Nye persondatakategorier eller følsomme oplysninger, CPR, helbred, strafbare forhold? | | |
| Profilering, infererede egenskaber, scoring eller segmentering? | | |
| Automatiske beslutninger med retsvirkning eller tilsvarende væsentlig effekt? | | |
| Børn, sårbare personer eller risiko for manglende reel valgfrihed? | | |
| Ansættelse, rekruttering, uddannelsesadgang eller medarbejderovervågning? | | |
| Kredit, forsikring, betalingsevne, offentlige ydelser eller adgang til vigtige tjenester? | | |
| Biometrisk identifikation, kategorisering, emotion inference eller lokationsdata? | | |
| Stor skala, systematisk monitorering, sammenkøring eller nye identifikatorer? | | |
| Sundhed, sikkerhed eller andre konsekvenser, som mennesker kan komme til at stole blindt på? | | |
| Nyt AI-formål, agenthandlinger eller mulig højrisiko-/forbudt anvendelse? | | |
| Nye underdatabehandlere, modeller, lande, supportadgang eller internationale overførsler? | | |
| Nye retentionperioder, kopier, emails, backups eller genbrug af chatindhold? | | |
| Ændret identitetsverifikation, tenant-isolation, eksport/sletning eller administratoradgang? | | |
| Prompt injection, hallucination, datalæk eller manipulation af ordre/produktinformation? | | |

Kontroller: minimisering, instrukser, kildekvalitet, menneskelig kontrol, AI-oplysning, ePrivacy/consent, adgang, rate limit, CSRF, kryptering, retention, eksport/sletning og tests.

Beslutningslog: åbne spørgsmål / juridisk reviewer / evt. DPIA-vurdering og begrundelse / leverandør- og overførselsvurdering / instruks- eller aftaleændring / konkrete blokeringer før release / ansvarlig og opfølgningsdato. “Ukendt” kræver afklaring; det er ikke et automatisk nej. Brug syntetiske testdata indtil relevant godkendelse foreligger.
