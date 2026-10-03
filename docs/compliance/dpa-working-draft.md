# Databehandleraftale for EmbedBot 1.0 — arbejdsudkast

Status: UDKAST. Ikke godkendt, publiceret eller indgået. Arbejdskopi oprettet den 3. oktober 2026 fra arkivversion 2026-10-02.draft-1. Denne fil ændrer ikke det historiske arkiv eller systemets mulighed for accept.

Samlet gennemgangsversion opdateret 3. oktober 2026 med parter, ansvar, godkendte opbevaringsvalg, ophør og praktiske procedurer. [Leverandørbilaget](dpa-supplier-annex.md) er en del af denne arbejdskopi. Driftens udeståender er samlet i [klar-til-kundestart-listen](dpa-readiness.md). Vercel og gendannelsestest er udtrykkeligt parkeret af Axel; ikke afsluttet.

Udestående felter og bilag skal færdiggøres før endeligt review og godkendelse. Min Kreative Verden har kun set en preview-demo oprettet af Axel; denne fil dokumenterer ingen kundeaccept eller opbevaringsaftale.

## 1. Parterne

Dataansvarlig: [kundens officielle juridiske navn], [CVR/registrering], [registreret adresse], [autoriseret kontaktperson og kontaktdata].

Databehandler: Axel Bødker Frederiksen, som leverer tjenesten EmbedBot. Ingen CVR, oplyst af Axel. Adresse: Smallegade 42, 4. tv., 2000 Frederiksberg, Danmark. Kontakt: axel@embedbot.dk, +45 91 55 12 50. Oplysningerne er bekræftet af Axel den 3. oktober 2026. Ingen udpeget DPO er oplyst; foreløbig screening er dokumenteret i contracting-party.md.

## 2. Genstand og varighed

Levering af website-chatbot, dashboard, vidensindlæsning og valgfrie webshop- og supportfunktioner. Behandling under kundens aktive brug og frem til aftalt returnering/sletning. Axel har godkendt højst 30 dages afslutningsperiode til eksport og sletning, med tidligere sletning efter kundens instruks. Praktisk ophørs- og backuphåndtering skal verificeres før endelig version.

## 3. Karakter og formål

Modtagelse, lagring, søgning og generering af AI-svar på kundens oplysninger; formidling af besøgendes spørgsmål og supportsager. Ordreopslag sker gennem kundens tilsluttede webshop med separat verifikation. Ingen tilsigtet profilering eller afgørelser med retsvirkning.

## 4. Datatyper og registrerede

Besøgende og kundens medarbejdere: chattekst, frivillige kontaktoplysninger, supportsagsbeskrivelse og valgfrit samtaleudsnit. Webshopordre: ordre-reference, email og begrænsede ordre/statusoplysninger. Videnskilder kan indeholde persondata og skal minimeres. Konto-, betalings- og egen supportbehandling vurderes særskilt som EmbedBots mulige dataansvar.

Dashboardet kan udtrække e-mailadresser fra besøgendes chatbeskeder til en leadoversigt med beskedudsnit, sideadresse og tidspunkt og eksportere oversigten som CSV. Kundens instruks og formål for denne behandling skal fastlægges. Funktionen registrerer ikke marketingtilladelse. Supportformularen har ikke et særskilt navnefelt; personoplysninger kan forekomme i fritekst. Den aktuelle almindelige chatbesked sendes til OpenAI til svar, også hvis den besøgende selv skriver personoplysninger. Særskilte ordreformularer og private ordresvar følger et separat verifikationsflow.

Axel præciserer, at kunden bestemmer formålet med leadopfølgning. Kunden skal dokumentere et konkret lovligt formål, behandlingsgrundlag og relevant besøgsinformation; dette er ikke tilladelse til vilkårlig brug. EmbedBot bruger ikke leads til egne salgsformål. En mailadresse i chatten er ikke i sig selv samtykke til elektronisk markedsføring; kunden skal selv sikre nødvendig tilladelse eller en konkret gældende undtagelse. DPA'en giver ingen marketingtilladelse.

Kodekontrol 3. oktober 2026: leadoversigten beregnes i dashboardets hukommelse ud fra eksisterende chats, ikke fra en særskilt leadtabel (app/dashboard/page.tsx, analytics useMemo og exportLeads). Leads i EmbedBot følger derfor chatfristen på 30 dage som aftaleudgangspunkt, ikke supportsagsfristen på 90 dage. Faktisk cleanup er stadig uverificeret. Kundens downloadede CSV-kopier ligger uden for EmbedBots slettekontrol; kunden er ansvarlig for deres lovlige brug og sletning.

## 5. Dokumenterede instrukser

Behandling alene efter dokumenterede instrukser i aftalen og kundens autoriserede dashboardvalg. Kunden bekræfter lovligt grundlag og korrekt besøgsinformation. EmbedBot gør opmærksom på instrukser, der vurderes ulovlige, og en eskalationsproces aftales. Nye formål kræver særskilt aftale.

Forslag til praktisk procedure: supplerende instrukser sendes af kundens autoriserede kontakt til axel@embedbot.dk eller via en verificeret kontokanal. Axel registrerer instruksen og afklarer uklare eller modstridende krav med kunden før udførelse. EmbedBot underretter straks kunden, hvis en instruks efter EmbedBots vurdering strider mod databeskyttelsesreglerne. Den omstridte behandling sættes i bero under afklaringen, i det omfang dette kan ske uden at kompromittere datasikkerheden.

## 6. Fortrolighed

Kun autoriserede personer med nødvendigt behov må få adgang og er underlagt fortrolighed. Axel oplyser den 3. oktober 2026, at han er eneste person med systemadgang på EmbedBots side. Dette erstatter ikke kontrol af platformenes adgangslister eller leverandørernes egne adgangsforhold. Hvis andre får adgang, skal bindende fortrolighed, nødvendig oplæring og adgangsbegrænsning etableres inden adgangen gives. Leverandørforpligtelser verificeres særskilt.

## 7. Bilag: sikkerhed

Verificeret i implementation: servervalideret login og ejerskab, tenant-filtre og RLS, serverbegrænsede commerce-tabeller, kryptering af webshopcredentials og ordrelokatorer, tidsbegrænset verifikation, rate limiting, Origin-kontrol på dashboardændringer, hemmeligheder via miljøvariable og begrænset auditlog. Infrastrukturkryptering, backup, restore, leverandøradgang og drift skal verificeres separat.

## 8. Underdatabehandlere

Fælles leverandøroversigt findes på /subprocessors. Juridiske enheder, rollefordeling og aftaler skal bekræftes. Procedure for varsling, indsigelser og udskiftning skal aftales; dette udkast er ikke generel godkendelse af leverandører.

Forslag til endelig ordning: kunden giver generel skriftlig godkendelse af de underdatabehandlere, som er identificeret i det færdige bilag ved aftaleindgåelse. EmbedBot varsler tilføjelse eller udskiftning mindst 30 kalenderdage før ændringen via kundens registrerede kontaktmail og giver mulighed for begrundet indsigelse inden ændringen. Parterne søger en løsning; den berørte nye behandling påbegyndes ikke for kunden, mens indsigelsen er uafklaret. Kan en lovlig løsning ikke findes, aftales ophør af den berørte tjeneste med returnering/sletning. EmbedBot pålægger underdatabehandlerne relevante databeskyttelsesforpligtelser i skriftlig aftale og forbliver ansvarlig for deres opfyldelse. Varslingsfristen er et forslag til EmbedBots egne ændringer, ikke en påstand om leverandørernes varslingsfrister.

## 9. Internationale overførsler

Ingen data residency, SCC- eller DPF-status antages. Faktiske modtagere, lande, supportadgang, videreoverførsler og relevant overførselsgrundlag skal verificeres og dokumenteres før endelig aftale.

## 10. Assistance ved rettigheder

Autoriseret kunde kan eksportere kontodata og søge, eksportere og slette besøgsdata inden for egen virksomhed. Kunden verificerer identitet og afgør anmodningen. Historiske samtaleudsnit uden reference og oplysninger hos andre modtagere kræver manuel gennemgang. Rettelse/begrænsning eskaleres til support.

Henvendelser fra registrerede om kundens behandling videresendes uden unødig forsinkelse til kundens autoriserede kontakt. EmbedBot træffer ikke selv afgørelse om anmodningen, medmindre kunden har givet en dokumenteret instruks. Axel bistår med relevante søgninger, sikker eksport, rettelse, begrænsning og sletning under hensyn til behandlingens karakter og de oplysninger, der er tilgængelige. Teknisk usikkerhed eller manglende søgeresultater meddeles kunden; det er ikke i sig selv bevis for, at der ikke findes personoplysninger.

## 11. Assistance ved sikkerhedsbrud

EmbedBot skal orientere kunden uden unødig forsinkelse efter at være blevet bekendt med et persondatabrud i kundens behandling og give tilgængelige oplysninger, risikovurdering, afværgning og opfølgning. Kontaktvej, bemanding og samarbejde skal fastlægges.

Axel sender den første orientering til kundens registrerede sikkerhedskontakt med kendte oplysninger om bruddets karakter, datakategorier, omtrentligt omfang, sandsynlige konsekvenser, kontakt og trufne/foreslåede afværgeforanstaltninger. Manglende oplysninger suppleres løbende uden unødig forsinkelse. Der ventes ikke på en afsluttet undersøgelse. Kunden afgør sine anmeldelses- og underretningspligter; EmbedBot bistår med nødvendig dokumentation og afværgning. Denne bestemmelse lover ikke døgnbemanding eller en særskilt fast reaktionstid.

## 12. Assistance ved vurderinger

Relevant information og rimelig bistand til kundens vurdering af sikkerhed, konsekvensanalyse og eventuel forudgående høring. Omfang og praktisk samarbejde skal aftales. Ingen automatisk konklusion om, hvorvidt en DPIA er nødvendig.

Efter anmodning leverer Axel tilgængelige oplysninger om behandling, sikkerhedsforanstaltninger, modtagere, lande og kendte risici og bistår kunden med forpligtelser efter artikel 32–36 under hensyn til behandlingens karakter. Kunden foretager den endelige vurdering og eventuelle myndighedskontakt. Praktiske rammer aftales uden at begrænse den lovpligtige assistance.

## 13. Bilag: retention

Axel har den 3. oktober 2026 godkendt følgende udgangspunkt for den endelige aftale: chat 30 dage, supportsager 90 dage og egne rullende databasebackups højst 30 dage. Kundens instruks og eventuelle begrundede afvigelser skal dokumenteres ved aftaleindgåelse. Leverandørkopier har separate vilkår.

Driftsstatus: eksisterende teknisk chatstandard er fortsat 90 dage; ændring til 30 dage, faktisk cleanup og backuprotation er ikke gennemført eller verificeret. Kopieret chatkontekst ryddes efter implementationen senest efter samtaleretention og ved tilknyttet samtales sletning. Challenges og forbindelsesforsøg slettes efter deres udløb. Restore skal håndtere tidligere sletninger uden at genindføre dem; gendannelsestest er udsat. De godkendte perioder er derfor et aftaleudgangspunkt, ikke dokumentation for fungerende produktionssletning. Se retention-proposal.md.

## 14. Returnering og sletning ved ophør

Efter kundens valg tilbageleveres eller slettes de personoplysninger, der behandles på kundens vegne, ved ophør. Axel har godkendt en aftalt afslutningsperiode på højst 30 dage fra tjenestens ophør til eksport og efterfølgende sletning; kunden kan instruere tidligere sletning. Perioden er ikke et fast GDPR-krav. Behandling i perioden begrænses til nødvendig sikker opbevaring, eksport og sletning. Kortere løbende slettefrister fortsætter og forlænges ikke ved ophør.

Eksisterende kopier skal også slettes, medmindre EU-ret eller national ret kræver opbevaring. Eventuel lovpligtig opbevaring afgrænses, dokumenteres og meddeles kunden. Egne backupkopier udfases efter den godkendte maksimale rotation på 30 dage; de må ikke bruges til andre formål, og gendannelse skal respektere tidligere sletninger. Leverandørkopier håndteres særskilt efter verificerede aftaler; Resends oplyste kontoophørsfrist må eksempelvis ikke fremstilles som 30 dage.

Driftsstatus: konto-/virksomhedssletning findes i koden, men eksportperioden, afslutningsadgang, backuprotation og sletning hos relevante leverandører er ikke gennemført eller verificeret. Særskilte retskrav og auditopbevaring skal fortsat afklares. Kundens valg indgår i den endelige aftale.

## 15. Audit og kontrol

Databehandleren stiller nødvendig information om opfyldelsen til rådighed og bidrager til kontroller efter artikel 28. Praktisk proces, varsel, fortrolighed og adgang til dokumentation skal aftales uden at begrænse lovbestemte rettigheder.

Forslag til praktisk ordning: kunden anmoder via axel@embedbot.dk. Dokumentationsgennemgang bruges som første trin, når den er tilstrækkelig. Ved nødvendig revision/inspektion aftales tidspunkt, omfang og sikker adgang med kunden eller en af kunden bemyndiget revisor. Fortrolighed og andre kunders oplysninger beskyttes uden at forhindre en effektiv kontrol. Der stilles ikke et absolut loft over antal kontroller eller krav om lang varsling ved brud, myndighedskrav eller konkret mistanke om manglende overholdelse.

## 16. Kontakt og eskalation

EmbedBots ansvarlige kontakt for persondataanmodninger og sikkerhedshændelser er Axel Bødker Frederiksen, axel@embedbot.dk, +45 91 55 12 50. Axel oplyser, at kun han har systemadgang; ingen stedfortræder er oplyst. Kundens autoriserede kontakt og sikkerhedskontakt registreres ved aftaleindgåelse. Der er ikke etableret eller lovet en døgnbemandet beredskabsordning. Fraværsdækning, alarmopsætning og faktisk procedure skal afklares før endelig driftsbeskrivelse.

## 17. Version og godkendelse

Udkastet arkiveres med versionsnummer og indholdshash. Kun en separat, udtrykkeligt godkendt publiceret version kan accepteres af en autentificeret virksomhedsejer. Accept gemmer virksomhed, bruger, version og tidspunkt; ingen IP/user agent. Eksisterende kunder får ikke automatisk accept.

## Arbejdspunkter før endelig version

- Kundens juridiske identitet, autoriserede kontakt og faktiske funktionsvalg.
- Godkendte behandlingsinstrukser og opbevarings-/ophørsperioder; 90 dage er et teknisk udgangspunkt, ikke en kundeaftale.
- Axel har godkendt chat 30 dage, tickets 90 dage, egne backups højst 30 dage og afslutning/eksport højst 30 dage. Kundens konkrete instruks og gennemførelse i drift udestår.
- Verificerede leverandøraftaler, juridiske enheder, roller, modtagere, lande og overførsler. Det historiske supplier-snapshot må ikke behandles som verificeret.
- Drifts- og sikkerhedsbilag, backup/restore, hændelseskontakter, assistance og audit.
- Juridisk review og Axels eksplicitte godkendelse af den færdige tekst.
- Efter godkendelse: ny arkivversion/hash og tilhørende migration efter projektets versionsprocedure; separat release og kundens egen accept.

Funktionsgrundlag: [kodegennemgang](embedbot-1-0-capabilities.md). Kundestatus: [Min Kreative Verden](min-kreative-verden-preparation.md).

Leverandørreview under arbejde: [Supabase — Free-plan oplyst af Axel](supabase-review.md).

Supplerende leverandørnoter: [OpenAI](openai-review.md), [Resend](resend-review.md), [Vercel](vercel-review.md). Vercel er verificeret på Hobby; den aktuelle offentlige DPA angiver Pro/Enterprise. Dette skal afklares før leverandørbilaget kan færdiggøres. Resend Enforced TLS er aktiveret efter Axels godkendelse. OpenAI AI Council har datadeling til træning slået fra. Disse kontroller afslutter ikke overførselsvurderingerne.
