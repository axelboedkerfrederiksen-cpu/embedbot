# Security policy — faktisk implementation

Lokal version 2. oktober 2026. **Verified** betyder kode/test eller konkret læst produktionsmetadata, ikke generel driftscertificering.

| Område | Status | Evidens og grænse |
|---|---|---|
| Authentication | Verified | Supabase SSR `getUser()` validerer bruger server-side. Auth-email/header er ikke identitet. Sessioner og flows fra leverandørkonto skal driftstestes efter release. |
| Admin authorization | Verified | Allowlist via `ADMIN_USER_IDS`; fallback kun verificeret loginemail + confirmed email matching `ADMIN_EMAIL`. `ADMIN_PASSWORD` og x-admin-* accepteres ikke. Ændring af allowlist er en privilegeret serverkonfiguration. |
| MFA | Verified / Requires manual verification | Guard kræver aal2 når konto har verificeret faktor eller `ADMIN_REQUIRE_MFA=true`. UI understøtter Supabase TOTP enrollment/challenge. Produktionsadmins skal enrolles og recovery/adgang testes før MFA-kravet aktiveres. MFA-produktionsindstilling er ikke ændret. |
| Ejer-/tenant isolation | Verified | Nye APIs: valideret UUID + getUser + business.user_id-match; SQL kontrollerer ejerskab igen. Origin-kontrol for ændringer og GDPR-opslag/eksport. Browserrolle kan ikke skrive compliance-/commerce-tabeller. |
| RLS | Verified (eksisterende prodmetadata og lokal migration) | Business/conversation/document/message-policy matcher auth.uid. Nye private tabeller har RLS og ingen browsergrants/policies; funktioner invoker, fast tom search_path, execute kun service_role. Produktionsmigrationen er ikke anvendt. |
| Commerce encryption | Verified | 32-byte nøgle fra miljø, AES-256-GCM, authenticated tenant/scopebinding; lokatorer krypteret, OTP/session hashes. Nøgler og credentials indgår ikke i eksport/audit. Rotation og nøgleforvaring skal organiseres. |
| Infrastrukturkryptering | Requires manual verification | HTTPS i konfiguration og sikre OAuth-cookies; konkret storage/backups, leverandørnøgler og certifikat/driftskrav skal verificeres. |
| Secrets | Verified / Requires manual verification | Server-env for Supabase servicekey, Stripe, Resend, commerce, cron. Ingen nye credentials i filer. Platformens adgangskontrol, rotation og historisk Git-/leverandør-logindhold skal kontrolleres. |
| CSRF | Verified | Browserændringer kræver samme Origin som request-URL. Tidligere usikre “header findes”-tokens er fjernet. Public widget-endpoints bruger separate session-/originbundne proofs; Stripe/OAuth har eget kryptografisk flow. |
| Rate limiting | Verified | Eksisterende atomic RPC for chat/commerce; besøgsrettighedsflow rate-limit pr. autoriseret bruger/virksomhed. Fejl blokerer adgang. Proxy-IP tillid afhænger af hostkonfiguration. |
| Retention | Verified / Requires manual verification | Central transaktionel, idempotent cleanup, relationelle context-triggers, jobstatus. 90-dages defaults samt support/kunde/auditperioder skal godkendes; faktisk Cron-kørsel/alerts skal verificeres. |
| Logging | Verified (nye flows) | Audit kun action, UUID, version, antal, tid. Cron kun faste status-/fejlkoder og tællinger. Nye auth/privacy APIs udleverer ikke rå databasefejl. Eksisterende og host/providerlogs kræver fortsat review. |
| Eksport/sletning | Verified | Allowlist og keyset pagination; ingen credentials/proofs. Owner-skoped visitorsearch og transactional delete; historiske refs og modtagerkopier har eksplicit begrænsning. Account Auth-delete/Stripe-cancel er separate eksterne trin; fejl eskaleres. |
| Backup/restore | Not verified | Ingen verificeret backupperiode, restoretest eller sletningsproces i backups. Indhent konkret plan og test evidens; antag ikke daglige backups eller fuld data residency. |
| Deployment | Requires manual verification | Ingen commit/deploy her. Review migration og staging først. Prod skal installere kompatibel migration før routes og overvåges; irreversible datarensningsjob skal først startes efter periodegodkendelse. |
| Adgangsreview | Requires manual verification | Ejer skal gennemgå Supabase/Vercel/Stripe/OpenAI/Resend/Plausible, Git og serverallowlist. Fjern afgående brugere og dokumentér mindst privilegeret adgang. |
| Beredskab | Implementation/documented; Requires manual verification | Se incident-response.md. Kontakt, stedfortræder, alerts, øvelse og bemanding udestår. |
| Leaked-password protection | Requires manual verification | Supabase security-advisor rapporterede disabled. Tilgængelig config/plan var ikke verificeret; præcise instrukser i MANUAL-ACTIONS.md. |

Ejerskab: Axel skal udpege sikkerhedsansvarlig, stedfortræder og reviewkadence. Sikkerhedshændelser eskaleres via dokumenteret beredskab. Ingen politiktekst erstatter implementeret kontrol eller test.

Opdatering 3. oktober 2026: Axel bekræfter sig selv som eneste person med systemadgang; han er ansvarlig kontakt på axel@embedbot.dk / +45 91 55 12 50. Ingen stedfortræder er oplyst. Leverandørernes medlemslister og MFA er endnu ikke kontrolleret. Første krypterede databasebackup er integritetskontrolleret og en ekstra kopi oplyst overført til stationær; restore er udsat. Axel har godkendt chat 30 dage, tickets 90 dage og egne backups højst 30 dage; ændring af drift og rotation udestår. Resend-domænet er verificeret med Enforced TLS. Se leverandørnoterne og beredskabet for evidens og grænser; tidligere tabel beskriver kodegennemgangens udgangspunkt.

Axel bekræfter efterfølgende totrinsbekræftelse på Google-kontoen med godkendelse i Gmail-appen. Dette er brugeroplyst, ikke kontrolleret i kontoen, og dokumenterer ikke automatisk MFA på leverandørkonti med alternative loginmetoder eller EmbedBots adminlogin.
