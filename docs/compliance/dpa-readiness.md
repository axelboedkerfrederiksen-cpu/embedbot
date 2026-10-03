# DPA — konkret status før kundeaccept

3. oktober 2026. Tekst og samlet leverandørbilag er klar til gennemgang som udkast. Ikke publiceret eller gjort accepterbar.

## Afklaret med Axel

- Aftalepart/kontakt og ham som eneste person med adgang; ingen stedfortræder.
- Chat og afledte leads: 30 dage. Supportsager: 90 dage. Egne backups: højst 30 dage.
- Ved kundeophør: højst 30 dage til eksport/sletning, eller tidligere efter kundens instruks.
- Kunden bestemmer lovligt formål med opfølgning og håndterer egne eksporter; ingen marketingtilladelse registreres i leadfunktionen.
- Google-totrinsbekræftelse brugeroplyst. OpenAI-træningsdeling Disabled og Resend Enforced TLS konkret kontrolleret.
- Første krypterede databasebackup integritetskontrolleret; ekstra kopi oplyst overført.

## Parkeret efter Axels valg

- Vercels Hobby-plan: DPA-/kommerciel aftaledækning skal løses før kundestart.
- Gendannelsestest: endnu ikke gennemført.

## Nødvendigt før færdig aftale/kundestart

1. Afstem leverandørernes faktiske enheder, modtagere/lande og overførselsgrundlag; færdiggør konkret overførselsvurdering. Afgræns Stripe/analyse og kontroller leverandørkopier ved tenant-sletning.
2. Gennemfør og kontroller 30-dages chatfrist, 90-dages tickets, løbende cleanup, leadoversigtens fjernelse, 30-dages backuprotation og ophørs-/eksportflow. Godkendte perioder er ikke ændret i produktion.
3. Kontroller MFA/adgangslister for admin og leverandørkonti, alarmer, fraværshåndtering, sletteassistance og praktisk revision. Ingen døgnbemanding loves.
4. Gennemgå den samlede tekst og bilag, godkend den endelige version og gennemfør den separate arkiv-/releaseprocedure. Ingen historiske versioner omskrives.
5. Kunden opretter selv konto og bot; juridisk identitet, autoriserede kontakter, aktiverede funktioner og instrukser registreres, og kunden accepterer den godkendte version.

Min Kreative Verden er fortsat kun en preview-demo oprettet af Axel. Der er ingen dokumenteret kundeaccept eller live kundestart.

## Lokal gennemførelse og test — efterfølgende

- Ny lokal migration 20261003093920_agreed_retention_defaults.sql sætter standard for fremtidige chats til 30 dage og tickets til 90 dage. Eksisterende kunders instrukser bevares; migrationen udfører ingen sletning.
- Dashboard og API-fallback viser samme nye udgangspunkt. Lokal PostgreSQL-test verificerer chatudløb efter 30 dage, fjernelse af kopieret ticketkontekst, bevaret ticket inden 90 dage og respekteret særskilt tenant-periode.
- Hele testsuiten efter browserrettelsen: 82 beståede, én eksisterende netværkstest sprunget over. TypeScript og målrettet lint består.
- scripts/backup-retention.py er klargjort; standard viser udløbne kopier, --apply sletter kun genkendte krypterede kopier ældre end 30 dage. Test af dry-run, faktisk sletning i isoleret testmappe, idempotens og bevarelse af nøgle/symlinks/uvedkommende filer består.
- [Isoleret browser-/API-/SQL-test](privacy-browser-verification.md) består for indstillinger, 30/90-dages oprydning, faktisk konto- og besøgsdownload samt besøgs- og kontosletning med tenant-afgrænsning. Kontoeksportens downloadflow er rettet lokalt.
- [Kundeophørsprocedure](customer-offboarding.md) er klargjort med tenant-scope, eksport, sletning, leverandørkopier og restore-genkontrol. Eksport og kontosletning er testet isoleret; fuld produktionsdrift, afbrydelse under eksportperioden og automatisk friststyring er ikke udført.
- [Supplerende leverandørkontrol](additional-supplier-review.md) afgrænser Stripe/analyse og registrerer aktuelle kilder/modtagere; kontospecifik transferafklaring udestår.

Ingen produktionsmigration, deployment eller sletning af virkelige backup-/kundedata er udført i dette trin. Drift og publiceret aftale kan derfor endnu ikke markeres afsluttet.

## Renskrivning efter Axels tekstgodkendelse

Axel har godkendt arbejdsgrundlaget og bedt om at se den renskrevne version før publicering. [Kundevendt tekst med bilag A–D](dpa-final-review.md) er klargjort; [intern releasekontrol](dpa-release-review.md) fastholder de åbne leverandør-/driftspunkter. Ingen publicering, arkivændring eller ny kundeaccept er udført. Tekstgodkendelse lukker ikke bilag C eller beviser produktionsdrift.
