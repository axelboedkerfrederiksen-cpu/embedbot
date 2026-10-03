# Opbevaring — delvist godkendt udgangspunkt

Den 3. oktober 2026 godkender Axel chat 30 dage, supportsager 90 dage og egne backups højst 30 dage som udgangspunkt. Efterfølgende godkender han også 30 dages eksportmulighed ved kundeophør, derefter sletning, med mulighed for tidligere sletning efter kundens instruks. Kundeinstruks og driftsimplementering udestår. Håndtering af leadkopier nedenfor er fortsat et implementeringspunkt.

| Data | Foreslået periode | Formål og begrænsning |
| --- | --- | --- |
| Besøgendes chat | 30 dage | Kortvarig kundeservice og opfølgning. Kunden kan aftale en anden begrundet periode. |
| Webshoppens supportsager | 90 dage | Giver længere tid til at afslutte sager; chatkopier følger den kortere chatfrist. |
| Leadoversigt i EmbedBot | Følger chatfristen, udgangspunkt 30 dage | Beregnes direkte fra chats i dashboardet; ingen særskilt leadtabel fundet i dette flow. Kundens downloadede CSV-kopier håndteres af kunden. Ingen marketingtilladelse antages. |
| Kundedata efter aftalens ophør | Højst 30 dages eksportmulighed, derefter sletning | Kunden vælger tilbagelevering eller sletning og kan instruere tidligere sletning. Kun opbevaring/eksport/sletning i afslutningsperioden; kortere løbende slettefrister fortsætter. Adgang og starttidspunkt skal implementeres/verificeres. |
| Egne rullende databasebackups | Højst 30 dage | Slettede data må ikke genindføres efter restore; der kræves dokumenteret gensletningsprocedure. Backuprotation er ikke etableret. |

Aktuel chat-/ticketstandard i koden er 90 dage. De godkendte perioder skal gennemføres og cleanup verificeres, før en endelig aftale kan love dem. Ingen produktionsperiode eller backupfil er ændret eller slettet ved denne godkendelse. Konto/regnskab, egen support, audit og leverandørkopier skal have særskilte perioder. Leverandøropbevaring følger de verificerede vilkår og må ikke fremstilles som styret af den lokale backupfrist.

Regelgrundlag: [Datatilsynets hjælpetekst til databehandlertilsyn](https://www.datatilsynet.dk/Media/637655638046113311/Bilag%202%20-%20Sp%C3%B8rgsm%C3%A5l%20med%20hj%C3%A6lpetekster.pdf) henviser til artikel 28, stk. 3, litra g: efter kundens valg sletning eller tilbagelevering ved ophør og sletning af kopier, med lovbestemte undtagelser. De 30 dage er EmbedBots aftaleforslag, ikke en frist pålagt eller godkendt af Datatilsynet. Afslutningsperioden skal være nødvendig og aftalt; den må ikke bruges til nye formål eller forlænge eksisterende slettefrister.
