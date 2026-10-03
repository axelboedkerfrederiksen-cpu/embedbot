# Supabase — leverandørreview under arbejde

3. oktober 2026. Axel oplyser, at projektet bruger Free-planen. Planen er ikke særskilt verificeret i billing-dashboardet. Ingen aftale er accepteret eller plan ændret i dette arbejde.

Axel bekræfter, at Supabase-kontoen er oprettet personligt af ham med axel.boedker.frederiksen@gmail.com. Dette dokumenterer hans oplysning om kontoejer og loginmail, ikke organisationens registrerede aftaledata eller accepteret dokumentversion. Loginmailen er intern leverandørkontakt og erstatter ikke den offentlige kontakt axel@embedbot.dk.

## Officielle kilder læst

- [Terms of Service](https://supabase.com/terms), afsnit 7: DPA indgår i aftalen. Kontoens konkrete aftalehistorik og aftalepart udestår.
- [Data Processing Addendum](https://supabase.com/legal/customer-resources/data-processing-addendum), version 1, 1. august 2026: offentlig aftalepart er Supabase Pte. Ltd. DPA beskriver Supabase som databehandler eller underdatabehandler afhængigt af kundens rolle. SCC'er indgår efter aftalens betingelser. Dette beviser ikke projektets faktiske dataoverførsler eller en afsluttet overførselsvurdering.
- [Password security](https://supabase.com/docs/guides/auth/password-security): kontrol mod kendte lækkede passwords kræver Pro eller højere. Punktet i MANUAL-ACTIONS.md kan derfor ikke afsluttes ved blot at aktivere funktionen på den oplyste Free-plan. Ingen opgradering er foretaget.

## Udestående kontospecifik dokumentation

- Organisationsejer/registreret aftalepart og relevant aftaleaccept/version kontrolleres i kontoens oplysninger. Personlig kontoejer og loginmail er oplyst af Axel ovenfor.
- Projektregion samt faktisk adgang, modtagere, underleverandører og eventuelle overførsler.
- Backup-, restore- og logforhold for den faktiske plan. Generelle sikkerhedsudsagn må ikke erstatte plan- og projektkontrol.
- Vurdering af sikkerhed og eventuel fremtidig planændring, herunder passwordbeskyttelse.

Resultaterne er arbejdsmateriale. Fælles offentlige leverandørmetadata og historiske supplier-snapshots er ikke ændret.

## Kontrol i Supabase-dashboardet

3. oktober 2026 blev den allerede indloggede browser brugt til en læsekontrol:

- Organisation: axelboedkerfrederiksen-cpu's Org. Dashboardets planbadge og forbrugsoversigt viser Free.
- Projektet embedbot vises i organisationen med region eu-central-1. Dette er databaseprojektets region, ikke dokumentation for alle behandlingssteder.
- Organization Settings → Legal Documents oplyser udtrykkeligt, at DPA indgår i vilkårene og gælder automatisk for alle organisationer; separat underskrevet DPA kræves ikke. Eventuelt tidligere underskrevet DPA forbliver bindende. Ingen sådan tidligere aftale er oplyst af Axel.
- Siden giver adgang til [Supabases TIA](https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf). Dokumentet er grundlag for videre vurdering, ikke i sig selv en afsluttet kontospecifik overførselsvurdering.
- Supabase Assistant-datadeling står som Disabled. Det vedrører Supabases dashboard-assistent, ikke EmbedBots eget OpenAI-kald.

Der blev ikke ændret indstillinger, accepteret aftaler eller opgraderet plan. Supabases generelle DPA-dækning er bekræftet i organisationens dashboard; kontospecifik acceptdato/historik er ikke vist. Kilder: organisationens Projects, General og Legal Documents-sider i den indloggede browser.

## TIA-kontrol

Dashboardets link blev åbnet den 3. oktober 2026. PDF'en er dateret 14. marts 2025 og beskriver Supabase Inc. som dataimportør, Supabase Pte. Ltd. som tilknyttet modtager samt mulige overførsler til USA og Singapore. Den offentlige DPA fra august 2026 angiver derimod Supabase Pte. Ltd. som aftalepart/dataimportør. Dokumenternes forskellige datoer og enheder skal afstemmes før TIA'en bruges som dækkende dokumentation for den aktuelle aftale; ingen ugyldighed eller afsluttet transfergodkendelse udledes alene af forskellen. Kilde: [TIA-PDF](https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf), især første side og modtager-/landelisten.

## Backup-status — 3. oktober 2026

Axel ved ikke, om der findes en backupordning, og oplyser, at han ikke har en kopi liggende. Embedbot-projektets oversigt i Supabase viser LAST BACKUP: No backups. Der blev ikke fundet en backup-rutine i projektets filer; eksterne rutiner er ikke undersøgt. Der foreligger derfor ingen bekræftet gendannelig backup eller restoretest.

[Supabases backupdokumentation](https://supabase.com/docs/guides/platform/backups), læst samme dag, anbefaler regelmæssige egne eksporter/off-site-kopier til Free-projekter og beskriver daglige backups med syv dages adgang på Pro. Databasebackup omfatter ikke selve Storage-filerne. Projektets lokale miljø har Data API-nøgler, men ingen konfigureret databaseforbindelse/password til en fuld dump; nøglerne er ikke læst ud i output. Ingen backup, planændring eller restore er udført. Valg af backupmetode, sikker opbevaring, periode, faste kørsler og isoleret restoretest udestår.

Axel vælger at beholde Free foreløbig og kender ikke databasepasswordet. Supabase CLI 2.119.0 er hentet i en midlertidig mappe, og db dump --help er kontrolleret. Docker er installeret, men forbindelsen til det lokale hjælpeprogram virkede ikke; startforsøget i brugergrænsefladen gav timeout. Database Settings-siden er åbnet til Axel. Den viser, at password ikke kan læses efter oprettelse, og at nulstilling afbryder eksisterende direkte databaseforbindelser. Password er ikke nulstillet, og første backup er stadig udestående. Næste afhængigheder: Axels lokale passwordhåndtering og fungerende Docker, derefter backup og isoleret restoretest.

Efterfølgende siger Axel "klar" til sin lokale passwordhåndtering. Docker 29.2.1 er nu verificeret kørende. Session pooler-host/user er læst fra Connect-panelet. scripts/backup-database.py er klargjort med skjult lokal passwordindtastning og miljøoverførsel til Supabase CLI, fem logiske dumpfiler samt projektets migrationsfiler. Filerne pakkes og AES-256-GCM-krypteres under den Git-ignorerede .backups-mappe; gendannelsesnøglen gemmes lokalt med rettighed 0600. Syntaks, password-flow uden password i argumenter, eksport/pakning, krypteringskontrol og oprydning er kontrolleret med kunstige data i en midlertidig mappe. Produktionsbackup og database-restore er endnu ikke udført. Adgangskoden er ikke modtaget i chatten. Browserstyring tillader ikke betjening af Terminal/Codex-appens input; Axel skal derfor starte scriptet lokalt og indtaste password selv. CLI-installationen er midlertidig og skal genklargøres, hvis cachemappen fjernes. Ekstern kopi, nøgleopbevaring, rotationsperiode og automatisering er endnu ikke etableret.

Første brugerforsøg viste kun eksport af roles.sql. Efterfølgende filkontrol fandt ingen færdig backup og en tom .backups-mappe. En reel CLI-dry-run mod en lokal testadresse viste, at CLI 2.119.0 med --db-url genererer tom PGPASSWORD trods SUPABASE_DB_PASSWORD. Årsagen til hele brugerforløbets tidlige stop er ikke fastslået, men denne konkrete fejl i første script er rettet: CLI bruges nu kun til at generere eksportinstrukser uden credentials; password-exporten fjernes, og instrukserne køres i den allerede tilgængelige Supabase PostgreSQL-container 17.11.0.002 med PGPASSWORD direkte i miljøet. TLS er sat til verify-full med systemets CA-rødder. Alle fem faktiske eksportinstrukser er kontrolleret med dry-run; pakning/kryptering og passwordoverførsel er igen testet med kunstige data. Fejlbeskeder viser nu en sikker kategori og exitkode. Første reelle backup kræver stadig et nyt lokalt brugerforsøg, og restore er fortsat utestet.

Andet brugerforsøg stoppede med certifikatfejl. Systemets standard-CA'er kunne ikke validere poolerens Supabase-certifikat. Det officielle CA fra Database Settings → Download certificate er nu gemt i scripts/certs/supabase-ca-2021.crt, hashkontrolleret og monteres read-only i backupcontaineren. verify-full beholdes. Kæde- og hostnamekontrol bestod både på værtsmaskinen og i containerens PostgreSQL-klient; containerproben brugte ingen adgangskode og stoppede ved "no password supplied", før SQL kunne udføres. Ingen reelle databaseeksporter eller restore er endnu udført. Scriptets syntaks og certifikat-hash er kontrolleret efter rettelsen.

## Første gennemførte backup

3. oktober 2026 kl. 10.45 dansk tid gennemførte Axel den lokale kørsel. Fil: .backups/embedbot-20261003T084559085652Z.backup.enc, 72.037 bytes. Separat lokal kontrol bestod AES-GCM-autentifikation, udpakkede arkivet i hukommelsen og verificerede størrelser/SHA-256 for alle 14 arkiverede filer. De fem SQL-eksporter er til stede og ikke tomme; data.sql er 146.185 bytes. Backup og gendannelsesnøgle har rettighed 0600. Ingen SQL-indhold, persondata eller nøglemateriale blev udskrevet under kontrollen.

Status: første lokal databasebackup er gennemført og integritetskontrolleret. Databasegendannelse er stadig ikke testet. Storage-filer, fuld miljøkonfiguration og applikationshemmeligheder er ikke inkluderet. Backup og nøgle ligger på samme Mac; separat sikker kopi og nøgleopbevaring udestår. Der er endnu ingen automatisk backupplan eller godkendt rotationsperiode. Dette afslutter ikke det samlede backup/restore-punkt.

Axel bekræfter efterfølgende, at både den krypterede backupfil og recovery-key.bin er overført med Blip til hans stationære. Modtagerkopiens checksum, adgangsrettigheder og mulighed for dekryptering er ikke kontrolleret. Axel beder om at gå videre og udsætter gendannelsestesten; ingen restoretest er startet. Opgaven står derfor fortsat som delvist afsluttet: første integritetskontrollerede lokale kopi og oplyst ekstra kopi er etableret, mens restore, automatisering, rotationsperiode og eventuelle Storage-filer udestår.
