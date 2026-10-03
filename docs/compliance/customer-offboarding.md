# Kundeophør — procedure til driftsgodkendelse

Ansvarlig: Axel, axel@embedbot.dk. Udgangspunkt godkendt 3. oktober 2026: højst 30 dage til eksport og sletning, med tidligere sletning efter kundens instruks. Ikke en automatisk udskydelse af tidligere slettefrister.

1. Bekræft ophørsdato og kundens valg af tilbagelevering/sletning via verificeret ejerkanal. Registrer virksomhedens id, frist og instruks; undgå chatindhold i sagsloggen.
2. Afslut aktiv behandling: stop widgetadgang og integrationer for den pågældende virksomhed, bevar kun nødvendigt eksport-/sletningsformål. Kontroller faktisk adgangsbegrænsning; prøveslut, betalingsopsigelse og kontosletning er forskellige handlinger.
3. Ved tilbagelevering anvendes kontoeksporten gennem ejerens autentificerede konto eller en aftalt sikker kanal. Kontroller indhold og tenant-afgrænsning. En download af legitime kundedata kan ikke bekræftes alene ved et klik.
4. Sletning udføres senest ved afslutningsfristens udløb, tidligere efter instruks. Kontoens eksisterende sletteflow har udtrykkelig bekræftelse og stopper betalt abonnement før Auth-sletning. Anvend ikke kontosletning som erstatning for én bots sletning, hvis samme konto ejer andre virksomheder; scope skal kontrolleres særskilt.
5. Kontroller virksomhedsdata, samtaler, tickets, context, kilder, integrationscredentials og relevante auth/sessionforhold. Håndter separate leverandørkopier og sendte mails efter de faktiske vilkår. Dokumenter begrænsninger og restfrister til kunden.
6. Registrer sletningen i en beskyttet minimal oversigt til brug ved restore. Ingen genoptagelse af normal drift fra backup før tidligere sletninger er genudført. Oversigtens adgang/opbevaring skal fastlægges; fuld automatisk restore-genkontrol er ikke implementeret.
7. Egne backupkopier på Mac og stationær gennemgås med scripts/backup-retention.py. Standardkørsel viser kun udløb; --apply sletter kun genkendte krypterede kopier efter 30 dage og bevarer recovery-key.bin. Rotation skal udføres på begge maskiner og dokumenteres. Ingen automatisk tidsplan er etableret, og en manuel eksport uden løbende rotation opfylder ikke alene maksimumfristen.
8. Bekræft afslutningen med dato, scope og eventuelle lovpligtige undtagelser, uden at love sletning fra kundens indbakke eller egne downloads.

Før kundestart: test hele proceduren på en isoleret testkunde, fastlæg adgang under eksportperioden og overvåg frister. Ingen produktion er ændret, konto slettet eller besked sendt ved oprettelsen af denne procedure.

Efterfølgende: [privatlivstesten 3. oktober](privacy-browser-verification.md) verificerer faktiske eksportdownloads og den eksisterende konto-slettehandler mod isoleret SQL med simuleret Auth. Den anden testkundes data bevares. Stop af behandling under eksportperioden, én-bot-scope, leverandørkopier og backup/restore er stadig særskilte åbne punkter.
