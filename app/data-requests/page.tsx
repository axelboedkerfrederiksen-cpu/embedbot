import Link from "next/link";

export default function DataRequestsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[var(--bg-page)] px-4 py-12 text-gray-900 sm:px-6 lg:px-8">
      <article className="privacy-policy mx-auto max-w-4xl">
        <div className="mb-10 not-prose">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">← Tilbage til EmbedBot</Link>
          <h1 className="mt-8 text-4xl font-normal tracking-tight text-gray-900">Anmodning om dine data</h1>
          <p className="mt-3 text-base text-gray-600">Indsigt, eksport, rettelse og sletning</p>
        </div>
        <section><h2>Sådan gør du</h2><p>Send din anmodning fra den e-mailadresse, der er knyttet til kontoen, til <a href="mailto:axel@embedbot.dk?subject=Anmodning%20om%20personoplysninger">axel@embedbot.dk</a>. Skriv om du ønsker indsigt, eksport, rettelse, begrænsning, indsigelse eller sletning.</p><p>Du kan også bruge <Link href="/support">supportformularen</Link>. Vi kan bede om yderligere oplysninger for at bekræfte din identitet og beskytte kontoen.</p></section>
        <section><h2>For kontohavere</h2><p>En teknisk dataeksport kan hentes via den beskyttede eksportfunktion, når du er logget ind. Kontakt os før kontosletning, hvis du først ønsker en kopi. Sletning kan ikke altid omfatte oplysninger, som skal bevares til bogføring, sikkerhed eller håndtering af retskrav.</p><p><a href="/api/auth/export-data">Download mine kontodata</a></p></section>
        <section><h2>Besøgende i en kundes chatbot</h2><p>Hvis du har skrevet i en chatbot på en anden virksomheds website, er den pågældende virksomhed normalt dataansvarlig. Oplys gerne virksomhedens navn, cirka tidspunkt og den side, hvor chatten blev brugt, så anmodningen kan findes og sendes til rette modtager.</p></section>
      </article>
    </main>
  );
}
