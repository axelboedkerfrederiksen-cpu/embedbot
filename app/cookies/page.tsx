import Link from "next/link";
import { CookiePreferencesButton } from "../components/cookie-consent";

export default function CookiePolicyPage() {
  return (
    <main id="main-content" className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8">
      <article className="privacy-policy mx-auto max-w-4xl">
        <div className="mb-10 not-prose">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">← Tilbage til EmbedBot</Link>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900">Cookie- og teknologipolitik</h1>
          <p className="mt-3 text-base text-gray-600">Senest opdateret: <time dateTime="2026-09-17">17. september 2026</time></p>
        </div>
        <p>Denne side beskriver cookies, lokal browserlagring og lignende teknologier på embedbot.dk. Den supplerer vores <Link href="/privacy">privatlivspolitik</Link>.</p>
        <section><h2>Nødvendig lagring</h2><p>Supabase Auth bruger cookies til login, sessionsstyring og sikkerhed. Disse cookies er nødvendige for konto- og dashboardfunktioner. Onboarding kan bruge local storage til midlertidigt at bevare formularoplysninger og et teknisk virksomheds-id, mens brugeren gennemfører opsætningen. Adminområdet kan bruge session storage i den aktuelle browserfane.</p></section>
        <section><h2>Analyse og ydeevne</h2><p>Embedbot.dk anvender Plausible Analytics, Vercel Web Analytics og Vercel Speed Insights, men først når du aktivt accepterer analyse i cookiebanneret. De er konfigureret som cookiefrie målinger, men kan modtage tekniske oplysninger som side, tidspunkt, browser, enhed, referrer, omtrentligt land og performance-målinger. De bruges ikke til målrettet annoncering eller sporing på tværs af websites.</p></section>
        <section><h2>Chatbot-widgetten</h2><p>Widgetten kan bruge local storage til kortvarigt at cache virksomhedens offentlige widget-indstillinger, så den indlæses hurtigere. Beskeder sendes først, når brugeren aktivt skriver og sender dem. Selve samtalen gemmes som beskrevet i privatlivspolitikken.</p></section>
        <section><h2>Tredjepartsindhold</h2><p>Valgte skrifttyper kan blive hentet fra Google Fonts, og offentlige platformlogoer kan blive hentet fra Simple Icons. En sådan hentning kan medføre, at leverandøren modtager almindelige forbindelsesdata som IP-adresse og browseroplysninger.</p></section>
        <section><h2>Ændringer og samtykke</h2><p>Vi indfører ikke annoncecookies eller anden ikke-nødvendig lagring uden at opdatere denne politik og indhente samtykke, hvor reglerne kræver det. Du kan til enhver tid ændre dit valg her:</p><CookiePreferencesButton /><p>Du kan også slette lokal lagring og cookies i browserens indstillinger; sletning af nødvendige login-cookies logger dig ud.</p></section>
        <section><h2>Kontakt</h2><p>Spørgsmål om teknologierne kan sendes til <a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a>. Du kan også læse mere hos <a href="https://www.datatilsynet.dk/regler-og-vejledning/cookies-og-lignende-teknologier" target="_blank" rel="noreferrer">Datatilsynet</a>.</p></section>
      </article>
    </main>
  );
}
