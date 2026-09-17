import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main id="main-content" className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8">
      <article className="privacy-policy mx-auto max-w-4xl">
        <div className="mb-10 not-prose">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">← Tilbage til EmbedBot</Link>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900">Betaling, opsigelse og refundering</h1>
          <p className="mt-3 text-base text-gray-600">Senest opdateret: <time dateTime="2026-09-17">17. september 2026</time></p>
        </div>
        <section><h2>Erhvervskunder</h2><p>EmbedBot sælges kun til erhvervskunder, som handler som led i deres virksomhed. Den almindelige 14-dages fortrydelsesret for forbrugere gælder derfor normalt ikke. Hvis du mener, at du har købt som forbruger ved en fejl, skal du kontakte os straks; ufravigelige rettigheder påvirkes ikke af denne politik.</p></section>
        <section><h2>Gratis pilot</h2><p>Den gratis 14-dages pilot kræver ikke betalingskort og bliver ikke automatisk omdannet til et betalt abonnement. Der er derfor ingen betaling at refundere for piloten.</p></section>
        <section><h2>Betalt abonnement</h2><p>Planerne faktureres månedligt forud og fornyes automatisk, indtil de opsiges. Alle viste priser er eksklusive moms. Der er ingen bindingsperiode ud over den allerede betalte måned, medmindre en individuel Enterprise-aftale udtrykkeligt siger andet.</p></section>
        <section><h2>Opsigelse</h2><p>Du kan opsige abonnementet i dashboardets betalingssektion. Opsigelsen stopper næste fornyelse, og adgangen fortsætter normalt til udgangen af den betalte periode. Du kan også kontakte <a href="mailto:axel@embedbot.dk?subject=Opsigelse%20af%20EmbedBot">axel@embedbot.dk</a>.</p></section>
        <section><h2>Refundering</h2><p>Betalte perioder refunderes som udgangspunkt ikke forholdsmæssigt, når perioden er begyndt. Kontakt os ved dobbeltbetaling, forkert beløb, dokumenteret betalingsfejl eller en længerevarende fejl, som væsentligt har forhindret brug af tjenesten. Vi vurderer anmodningen konkret og retter dokumenterede faktureringsfejl.</p></section>
        <section><h2>Sådan anmoder du</h2><p>Send virksomhedens navn, konto-e-mail, fakturadato og en kort forklaring til <a href="mailto:axel@embedbot.dk?subject=Anmodning%20om%20refundering">axel@embedbot.dk</a> eller brug <Link href="/support?type=complaint">klageformularen</Link>. Send ikke kortnummer eller andre fulde betalingsoplysninger.</p></section>
      </article>
    </main>
  );
}
