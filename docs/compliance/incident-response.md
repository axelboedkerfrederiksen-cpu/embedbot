# Incident response — arbejdsplan

Udkast, kræver ejerens godkendelse, bemanding og øvelse. Ingen garanti om døgnbemanding. Eksisterende kontakt axel@embedbot.dk; sikkerhedsansvarlig, stedfortræder, intern telefon og kundernes sikkerhedskontakter skal udfyldes.

1. **Detection:** Modtag rapport eller alarm. Registrér opdagelsestid og tidspunkt for faktisk kendskab til et muligt persondatabrud separat. Et fejlet cleanup-job er et driftssignal, ikke automatisk et persondatabrud. Bevar minimal, adgangsbegrænset evidens.
2. **Containment:** Stop berørt endpoint/integration eller deployment, tilbagekald kompromitterede credentials/sessioner, begræns adgang og isolér tenant. Undgå destruktiv sletning af nødvendig evidens og unødig nedlukning af andre kunder.
3. **Investigation:** Kortlæg hændelse, berørte systemer/tenants/personer, datakategorier, eksfiltration, periode, hvem der havde adgang, og hvad der faktisk er kendt. Brug ikke komplette chats eller tokens i almindelige ticket-/auditlogs.
4. **Risk assessment:** Menneskelig sikkerheds-/juridisk vurdering af risiko for personer, følsomhed, volumen, identifikation, modtagere og afværgning. Beslut EmbedBots rolle for hver behandling; ukendt risiko er ikke “ingen risiko”.
5. **Documentation:** Breach-log med fakta, beslutninger og begrundelser, også hvor anmeldelse ikke vurderes nødvendig. Beskyt evidens, adgang og slettefrist. Ingen selvopfundet bevisretention.
6. **Customer notification:** Som databehandler orienteres den dataansvarlige uden unødig forsinkelse efter kendskab. Del kendte kategorier, omfang, kontakt, konsekvenser og afværgning; følg op ved nye fakta. Vent ikke på perfekt undersøgelse eller en antaget 72-timers databehandlerfrist.
7. **Regulatory assessment:** Dataansvarlig skal vurdere anmeldelse uden unødig forsinkelse og om muligt inden 72 timer efter kendskab, med den relevante risikoundtagelse og begrundelse ved forsinkelse. Vurder særskilt underretning af personer ved høj risiko og eventuelle undtagelser. Axel/juridisk ansvarlig afgør pligt og kompetent myndighed for den konkrete behandling.
8. **Remediation:** Ret og test årsagen, roter relevante nøgler, genskab kun godkendte data, verificér tenant-isolation og monitorér. En restore må ikke utilsigtet genoplive slettede persondata.
9. **Postmortem:** Dokumentér rodårsag, detektions-/reaktionstider, kundekommunikation, forbedringer, ansvarlig og deadline. Opdater kontroller, literacy og risikoscreening; planlæg øvelse.

Verificerede regelsources: [Datatilsynets sikkerhedsvejledning](https://www.datatilsynet.dk/regler-og-vejledning/grundlaeggende-begreber/hvordan-beskytter-du-personoplysninger) og [vejledning om brud](https://www.datatilsynet.dk/Media/637886298435856391/H%C3%A5ndtering%20af%20brud%20p%C3%A5%20persondatasikkerheden.pdf). Procedurens konkrete pligter og kontaktveje skal juridisk gennemgås.

## Breach-log skabelon

- Intern sagsreference:
- Opdaget / kendskab (UTC) / rapportør via sikker kanal:
- Ansvarlig og stedfortræder:
- Berørt behandling, rolle, kunde og system:
- Kendte datakategorier / omtrentligt antal personer og records:
- Tidslinje, fakta, usikkerheder og sikker evidensreference:
- Containment og resterende eksponering:
- Menneskelig risikovurdering og beslutningsgrundlag:
- Kunde orienteret hvornår, af hvem og opfølgning:
- Myndighedsvurdering, beslutning, frist og begrundelse:
- Registrerede vurderet/orienteret; kanal og begrundelser:
- Retning, tests, restore/sletningskontrol:
- Postmortem og ejere af opfølgning:
- Adgang og godkendt bevarings-/slettebeslutning for log/evidens:
