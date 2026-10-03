# Resend — leverandørkontrol

Kontrolleret 3. oktober 2026. Axel bekræfter personlig oprettelse med axel.boedker.frederiksen@gmail.com.

## Aftale og behandling

[DPA](https://resend.com/legal/dpa), opdateret 31. december 2025, er indarbejdet i aftalen med Plus Five Five, Inc. Kunden kan være dataansvarlig eller databehandler; Resend behandler kundedata som databehandler. Kontodata behandles særskilt som dataansvarlig. Den indloggede konto under Settings → Documents viser en leverandørunderskrevet DPA og oplyser, at den gælder ved tilmelding. Den linkede PDF er ikke gennemgået eller versionsafstemt med den aktuelle webtekst endnu.

[GDPR-oplysninger](https://resend.com/security/gdpr): lagring sker i USA også ved europæisk afsenderregion. Resend beskriver SCC-modul 2/3 og DPF som overførselsgrundlag; konkret overførselsvurdering og aktuel certificering er endnu ikke verificeret. Mail/logdata opbevares ifølge siden 30 dage på Free/Pro/Scale; resterende kundedata slettes inden 90 dage efter kontoophør, backups består syv dage. Tidligere sletning af en mail kræver kontakt til Resend. Almindelige Emails API-kald sendes ifølge siden ikke til Anthropic; RunPod behandler en mindre stikprøve til trust/safety. [Underdatabehandlerliste](https://resend.com/legal/subprocessors), opdateret 27. august 2026, skal indgå i den videre vurdering.

## Læsekontrol af konto

- Teamnavn: axel.boedker.frederiksen. Usage viser Free.
- embedbot.dk er Verified. Afsenderregion: Ireland, eu-west-1; dette dokumenterer ikke europæisk lagring.
- Domæne → Configuration: TLS står Opportunistic. Dashboardet forklarer, at mail kan sendes ukrypteret til modtagerens mailserver, hvis en TLS-forbindelse ikke kan etableres. Enforced TLS kræver TLS og kan derfor medføre manglende levering til modtagere uden TLS.
- Sporingstilstanden er ikke fastslået; siden viser Configure for tracking metrics.

Ingen indstillinger blev ændret, aftaler accepteret eller mails sendt. Valg af Enforced TLS, versionskontrol af DPA, overførselsvurdering, sletteprocedure og underdatabehandlere udestår.

## Godkendt ændring af TLS

Axel autoriserer efterfølgende ændring til Enforced TLS, efter oplysning om at modtagere uden TLS ikke får mails leveret. Ændringen udføres i domænets Configuration og bekræftes i Resends dialog. Slutstatus dokumenteres nedenfor; øvrige udeståender ovenfor består.

Slutkontrol 3. oktober 2026: embedbot.dk → Configuration → TLS viser Enforced efter afsluttet gemmedialog. Ændringen er gennemført. Skærmbillede gemt lokalt i /private/tmp/embedbot-resend-enforced-tls.png. Ingen testmail er sendt; faktisk levering er ikke testet.
