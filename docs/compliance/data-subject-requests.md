# Registreredes rettigheder — praktisk procedure

Udkast til godkendelse. EmbedBots eksisterende kontakt er axel@embedbot.dk og `/data-requests`. Sikre svar-/identitetskanaler, ansvarlig, stedfortræder og friststyring skal etableres. En indtastet email eller samtalereference er aldrig identitetsbevis.

1. Registrér dato, type, relevant kunde og intern sagsreference. Undgå at kopiere hele chatten eller identitetsdokumenter til audit/logs.
2. Afklar rollen. For egne konti, betaling og EmbedBot-support skal EmbedBot vurdere sit dataansvar. For kundens besøgsdata er kunden normalt dataansvarlig og afgør anmodningen; EmbedBot assisterer efter instruks.
3. Kontroller identitet proportionalt via den eksisterende verificerede kundekanal, konto eller webshopkontakt. Brug ikke blot søgeresultater som verifikation. Kræv ikke fuldt ID-dokument uden konkret nødvendighed og godkendt procedure.
4. Log frist og ansvarlig; eskaler tvivl, mulige undtagelser, tredjepartsdata eller følsomme oplysninger til Axel og juridisk rådgiver. Frister og begrundede forlængelser skal følge den aktuelle lovgivning og godkendte procedure.
5. Find, vurder, udfør og dokumentér resultatet; send kun relevante oplysninger via godkendt sikker kanal. Opbevar beslutningsbevis minimalt efter besluttet periode.

| Rettighed | Faktisk teknisk assistance | Vurdering / resterende handling |
|---|---|---|
| Indsigt/adgang | Kontoeksport; autoriseret business-ejer kan søge og eksportere besøgsdata via email eller conversation-ID. Visitor-eksport sideinddeles uden 500/1000-row truncation. | Ejer skal kontrollere tredjepartsoplysninger, aliaser, historiske kontekster og rolle. Ingen automatisk fuld indsigt af enhver mailadresse. |
| Sletning | Owner visitor-delete sletter matchende conversations/tickets i én transaktion; linked context ryddes; kontoendpoint fjerner virksomhed med relationer og Auth-login efter Stripe-stop. | Undtagelser/retskrav afgøres af ansvarlig. Sendte emails, webshop og backups er separate modtagere/systemer. |
| Rettelse | Virksomhedens offentliggjorte viden/contact kan ændres i dashboard. Andre persondata-rettelser kræver supportinstruks og valideret scope. | Ingen generisk rå database-editor eller automatisk identitetsretning. Kunden afgør hvad der er korrekt. |
| Begrænsning | Ikke et færdigt flag pr. besøgende. Ejer/support kan efter verificeret instruks tage botten offline og håndtere sag særskilt. | Eskalér til Axel; definér hvilke processer der skal stoppe og bevaringsgrundlag. Sletning er ikke en erstatning for begrænsning. |
| Portabilitet | JSON-download for konto og relevante besøgsrecords. Dokumenterede allowlists omfatter profil, virksomhed, samtaler, message/support/ticket, kilde og integrationsmetadata. | Retlig anvendelighed og hvilke “afgivne” oplysninger der omfattes afgøres menneskeligt. |

Eksport udelader passwords, hash, auth metadata, API keys, access tokens, encrypted credentials, challenge/orderlocators, connection proofs, rate-limit hashes og interne auditlogs. Embeddings er ikke personprofil og udelades; kildeindhold inkluderes. Legal versions accepted by the customer are included with their archived text/hash.

Begrænsninger: chat-email er ikke verificeret; historiske chats uden kendt email/ref kan ikke sikkert matches; allerede kopierede udsnit før den nye referencefunktion kræver manuel kontrol. Midlertidige krypterede ordreverifikationsrecords, webshopdata og allerede afsendte emailkopier indgår ikke i visitor-opslaget; de kræver særskilt gennemgang ved en anmodning. Udløbne verifikationsrecords håndteres af central cleanup. Sideinddelt eksport er ikke en fælles databasesnapshot under samtidige writes. Kan ikke bekræftes “ingen data” alene på baggrund af nul søgematches.

Audit gemmer handling, actor-ID, company-ID, tidspunkt og antal; selector og indhold gemmes ikke. Rettighedssagsbevis skal opbevares sikkert uden for denne minimale audit med en godkendt periode og adgang.

Fristgrundlag verificeret hos [Datatilsynet](https://www.datatilsynet.dk/regler-og-vejledning/gdpr-univers-for-smaa-virksomheder/trin-5-soerg-for-at-have-gode-procedurer): svar normalt inden én måned; begrundet forlængelse med yderligere to måneder kan være relevant. Vurder konkrete betingelser, besked om forlængelse og databehandlerens assistance med juridisk ansvarlig. Ingen automatisk forlængelse.
