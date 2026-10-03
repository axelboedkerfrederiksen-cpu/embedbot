# Retention og cleanup

Tekniske perioder er adskilt fra juridisk godkendelse. Kundens eksisterende samtalestandard er 90 dage. Supportsager bruger samme tekniske default. Axel/kunden skal godkende perioderne, og politik/aftale skal afspejle dem. Ingen eksisterende kundedata eller produktionsperioder er ændret her.

| Data | Opbevaring i implementation | Sletning / relation |
|---|---|---|
| conversations og messages JSON | Positive `businesses.retention_days`; eksisterende default 90 dage | Central cleanup ved udløb, soft-delete og virksomhedens soft-delete. Ejer kan slette straks. Messages er samme record, ikke en ekstra tabel. |
| commerce_tickets | `business_privacy_settings.ticket_retention_days`, default 90 dage | Hele sagen slettes, også kontaktmail, beskrivelse, ordrenummer og context. Status lukket ændrer ikke fristen. Der er ikke bevaret anonymiserede sagsmetadata, fordi ingen dokumenteret særskilt statistikbrug begrunder det. |
| Kopieret ticket context | Aldrig længere end ticketretention; ryddes efter samtaleretention fra kopiens oprettelse | Ny context kobles til signeret, tenant-/widget-sessionbundet samtalereference. Sletning af tilknyttet originalchat rydder context. Historiske context uden referencer har tidsbaseret cleanup; specifik historisk sletningsanmodning kræver også manuel gennemgang. |
| commerce_order_challenges | Serverens konkrete `expires_at` | Slettes centralt ved udløb, også brugte challenges. Ordrelokator er krypteret; koder/sessioner hashes. Ingen ordreprofil bygges. |
| commerce_connection_attempts | Serverens `expires_at` (10 minutter ved WooCommerce-start) | Slettes centralt efter udløb, uanset consumed-status. |
| chat_rate_limits | Eksisterende 48 timers tekniske cutoff | Hashes/counters slettes centralt. Proxy-/hostlogs er en separat leverandørvurdering. |
| website_sources | Aktiv kundekilde; udskiftes eller fjernes af ejeren | Én kilde pr. virksomhed, cascade ved kontolukning. Ingen arbitrær aldersfrist: kilden bruges løbende som instruktion. Kunden skal minimere persondata i kilder. |
| documents / embeddings | Aktiv viden | Slettes ved genindlæsning/kontosletning; embeddings udelades fra eksport, tekst inkluderes. Driftens kildeopdatering skal verificeres. |
| customer_messages | Særskilt `customer_message_days` i `compliance_retention_config` | NULL indtil ansvarlig har besluttet periode. Ved besluttet positiv periode håndterer central cleanup udløb. Cascade ved virksomhedssletning. |
| support_messages | Særskilt `support_message_days` | NULL indtil beslutning; positiv periode håndteres centralt. Kontosletning fjerner matches på kontoemail. Anonyme/andre mailadresser kræver manuel identitetskontrol og sletning. |
| profiles / businesses / integration metadata | Aktiv konto og aftale | Konto-/virksomhedssletning; profiles cascade fra Auth. Webshopcredentials kan afbrydes straks. Regnskabsbevaring hos Stripe vurderes separat. |
| legal_acceptances | Aktiv kunderelation; separate dokumentarkiver | Kundeaccept cascade ved virksomhedssletning, actor sættes NULL ved Auth-sletning. Aftalebevis efter ophør kræver særskilt beslutning/arkiv, ikke automatisk evig personlog. Versionstekst/hash indeholder ingen kunder. |
| compliance_audit_events | Separat `audit_days`, NULL indtil beslutning | Ingen tekst, email, selectors, IP eller UA. Kun UUID-reference, handling, version, antal og tidspunkt. Referencer sættes NULL ved sletning. Axel skal fastlægge periode og adgangsreview. |
| maintenance_runs | Separat `maintenance_days`, NULL indtil beslutning | Jobnavn, status, tid, antal og fast fejlklasse; ingen persondata. |
| Browsersession / widget | Widget kun memory | Forsvinder ved sidelukning. Se `/cookies` for faktisk konto-/onboardinglagring. |
| Sendte emails, leverandørlogs og backups | Requires manual verification | Lokal sletning kan ikke slette en allerede leveret mail i kundens indbakke eller en leverandørbackup. Aftal instrukser, perioder og restore-begrænsning. |

`compliance_cleanup()` kører i én transaktion, er idempotent og service-role-only. Alle relationer behandles inden for samme business-id. Jobstatus gemmes separat, så fejl ikke markeres som succes. Dashboard viser sidste registrerede fuldførte cleanup; før drift bekræftes, er manglende status ikke bevis for en fungerende scheduler.

Vercel-konfiguration har daglig cleanup 02:15 UTC og support-retry 02:45 UTC. Det holder sig til to daglige jobs, mens plan er uverificeret. Support-retry behandler højst 50 pr. kørsel og har eksisterende 23-timers mail-dedupliceringsvindue. På en verificeret plan med hyppige Cron-jobs bør support køre hvert 5. minut; daglig drift garanterer ikke retry inden vinduet. Vercel-kørsel, CRON_SECRET, queue-kapacitet og alerts skal verificeres før produktion.
