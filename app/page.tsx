"use client";
import { PLANS } from "@/lib/plans";
import { TRIAL } from "@/lib/compliance/trial";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, MessageCircle, Plus, X } from "lucide-react";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import { CookiePreferencesButton } from "./components/cookie-consent";
import ChatPreview from "./components/landing-chat-preview";
import styles from "./landing.module.css";
const questions = [
    { title: "Hvad skal jeg gøre for at komme i gang?", answer: "Send os din webshops adresse og lidt information om de spørgsmål, dine kunder typisk stiller. Vi gennemgår siden og hjælper med at gøre chatbotten klar." },
    { title: "Kan jeg prøve EmbedBot først?", answer: TRIAL.summary },
    { title: "Skal jeg kunne kode?", answer: "Nej. Vi hjælper med opsætningen. Chatbotten indsættes på din hjemmeside med et lille stykke kode, og vi guider dig gennem installationen." },
];
export default function Home() {
    const [demoStatus, setDemoStatus] = useState<"idle" | "loading" | "error">("idle");
    const loading = useRef(false);
    const [showDemoPrompt, setShowDemoPrompt] = useState(false);
    const heroRef = useRef<HTMLElement>(null);
    const [heroVisible, setHeroVisible] = useState(true);
    const demoPromptTimer = useRef<number | null>(null);

    useEffect(() => {
        // Invite visitors only after they have had time to explore the product.
        demoPromptTimer.current = window.setTimeout(() => setShowDemoPrompt(true), 8000);
        const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting));
        if (heroRef.current) observer.observe(heroRef.current);
        return () => {
            observer.disconnect();
            if (demoPromptTimer.current !== null) window.clearTimeout(demoPromptTimer.current);
        };
    }, []);

    useEffect(() => {
        if (!showDemoPrompt) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setShowDemoPrompt(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [showDemoPrompt]);

    function dismissDemoPrompt() {
        if (demoPromptTimer.current !== null) window.clearTimeout(demoPromptTimer.current);
        setShowDemoPrompt(false);
    }
    async function openDemo() {
        dismissDemoPrompt();
        if (loading.current)
            return;
        const openBubble = () => {
            const bubble = document.getElementById("eb-bubble") as HTMLButtonElement | null;
            if (!bubble)
                return false;
            if (/open|åbn/i.test(bubble.getAttribute("aria-label") || ""))
                bubble.click();
            return true;
        };
        if (openBubble())
            return;
        loading.current = true;
        setDemoStatus("loading");
        try {
            let script = document.getElementById("embedbot-demo-script") as HTMLScriptElement | null;
            if (!script) {
                script = document.createElement("script");
                script.id = "embedbot-demo-script";
                script.src = "/widget.js?v=landing-preview-1&id=a2678b5f-6d8b-415f-bbc0-ef3ce2a148bc";
                script.setAttribute("data-name", "EmbedBot");
                script.setAttribute("data-primary-color", "#ffffff");
                script.setAttribute("data-secondary-color", "#f6f3ed");
                script.setAttribute("data-fab-color", "#ffffff");
                script.setAttribute("data-font", "Inter");
                script.onerror = () => script?.remove();
                document.body.appendChild(script);
            }
            await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const timer = window.setInterval(() => {
                    if (openBubble()) {
                        window.clearInterval(timer);
                        resolve();
                    }
                    else if (++attempts >= 60) {
                        window.clearInterval(timer);
                        reject(new Error("Demo unavailable"));
                    }
                }, 200);
            });
            setDemoStatus("idle");
        }
        catch {
            setDemoStatus("error");
        }
        finally {
            loading.current = false;
        }
    }
    return (<main id="main-content" className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primær navigation">
          <Link href="/" className={styles.logo}><Image src={logoImage} alt="" priority/><span>EmbedBot</span></Link>
          <div className={styles.navCenter}><a href="#saadan-virker-det">Sådan virker det</a><Link href="/prices">Priser</Link><Link href="/support">Kontakt</Link></div>
          <div className={styles.navActions}><Link href="/login" className={styles.login}>Log ind</Link><Link href="/setup" className={styles.button}>Start 14 dage gratis <ArrowRight size={15}/></Link></div>
        </nav>
      </header>

      <section ref={heroRef} className={`${styles.hero} ${styles.container}`} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AI-KUNDESERVICE TIL DIN WEBSHOP</p>
          <h1 id="hero-title">Giv kunderne svar.<br /><span>Giv jer selv mere tid.</span></h1>
          <p className={styles.lead}>AI-kundeservice, der kender jeres produkter, ordrer og politikker. Giv kunderne svar direkte i webshoppen — også efter lukketid.</p>
          <div className={styles.heroActions}><Link href="/setup" className={styles.button}>Start 14 dage gratis <ArrowRight size={17}/></Link><button className={styles.textButton} onClick={openDemo} disabled={demoStatus === "loading"}>{demoStatus === "loading" ? "Åbner demo…" : "Prøv demoen"}<ArrowRight size={16}/></button></div>
          <p className={styles.trialDisclosure}>{TRIAL.days} dage gratis. Derefter fra {PLANS.starter.monthlyPriceDkk} kr./md. ekskl. moms. Opsig når som helst. <Link href="/prices">Se alle priser</Link>.</p>
          <div className={styles.reassurance}><span><Check size={14}/> Hjælp til opsætning</span><Link href="/privacy"><Check size={14}/> GDPR-fokuseret</Link><span><Check size={14}/> Til webshops på tværs af platforme</span></div>
          {demoStatus === "error" && <p className={styles.demoError} role="status">Demoen kunne ikke åbnes lige nu. Prøv igen, eller <Link href="/support">kontakt os</Link>.</p>}
        </div>
        <ChatPreview />
      </section>

      <section id="saadan-virker-det" className={`${styles.howItWorks} ${styles.container}`} aria-labelledby="how-it-works-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>SÅDAN VIRKER DET</p><h2 id="how-it-works-title">Fra spørgsmål til svar på sekunder.</h2></div>
        <ol className={styles.flowSteps}>
          {[
            { title: "EmbedBot læser jeres webshop", text: "Jeres produkter, levering og retur bliver grundlaget for svarene." },
            { title: "Kunden stiller et spørgsmål", text: "Chatten er lige dér, hvor kunden handler — klar, når der er brug for hjælp." },
            { title: "EmbedBot svarer eller sender videre", text: "Kunden får et svar eller kan sende en supportsag til jeres team." },
          ].map((step, index) => <li key={step.title}><span className={styles.flowNumber}>{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p>{index < 2 && <ArrowRight className={styles.flowArrow} size={18} aria-hidden="true" />}</li>)}
        </ol>
      </section>

      <section className={`${styles.platforms} ${styles.container}`} aria-label="Webshops på tværs af platforme">
        <p>Bygget til webshops.<br /><span>AI-kundeservice på tværs af platforme og egne hjemmesider.</span></p>
        <div className={styles.platformNames}>
          <a href="https://www.shopify.com" aria-label="Shopify"><Image src="/platforms/shopify.svg" alt="Shopify" width={108} height={31} /></a>
          <a href="https://webflow.com" aria-label="Webflow"><Image src="/platforms/webflow.svg" alt="Webflow" width={112} height={28} /></a>
          <a href="https://woocommerce.com" aria-label="WooCommerce"><Image src="/platforms/woocommerce.png" alt="WooCommerce" width={88} height={30} /></a>
          <a href="https://wordpress.org" aria-label="WordPress"><Image src="/platforms/wordpress.png" alt="WordPress" width={132} height={30} /></a>
        </div>
      </section>

      <section className={`${styles.section} ${styles.container}`}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>EN NATURLIG DEL AF JERES WEBSHOP</p><h2>De samme spørgsmål.<br /><span>En lettere hverdag.</span></h2><p>Fra det første produktspørgsmål til de praktiske detaljer. Gør det nemt for kunderne at komme videre.</p></div>
        <div className={styles.features}>
          {[{ number: "01", title: "Hjælp til at vælge", text: "Guid kunderne til relevante produkter med svar og links fra jeres webshop.", example: "“Hvilken model passer til mig?”" }, { number: "02", title: "Svar på det praktiske", text: "Giv svar om levering, retur og andre vilkår ud fra jeres eget indhold.", example: "“Hvordan returnerer jeg en vare?”" }, { number: "03", title: "Til stede efter lukketid", text: "Lad kunderne finde hjælp på siden, når spørgsmålet opstår. Også uden for åbningstiden.", example: "“Kan jeg få lidt hjælp?”" }].map(feature => <article className={styles.feature} key={feature.number}><span className={styles.number}>{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p><div className={styles.example}><MessageCircle size={16}/><span>{feature.example}</span></div></article>)}
        </div>
      </section>

      <section className={styles.setupSection}>
        <div className={`${styles.container} ${styles.setupGrid}`}><div><p className={styles.eyebrow}>VI HJÆLPER DIG I GANG</p><h2>Din webshop.<br />Jeres viden.<br /><span>En hjælpsom chatbot.</span></h2><Link href="/setup" className={styles.textButton}>Start 14 dage gratis <ArrowRight size={17}/></Link></div><ol className={styles.steps}>{[{ title: "Fortæl os om din webshop", text: "Send os jeres hjemmeside og de spørgsmål, kunderne typisk stiller." }, { title: "Vi gør EmbedBot klar", text: "Vi tager udgangspunkt i jeres indhold og hjælper med opsætningen." }, { title: "Prøv den på jeres side", text: "Se, hvordan chatbotten hjælper kunderne, og tilpas den sammen med os." }].map((step, i) => <li key={step.title}><span className={styles.stepNumber}>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></div>
      </section>

      <section className={`${styles.faq} ${styles.container}`}><div><p className={styles.eyebrow}>GODT AT VIDE</p><h2>Lidt færre<br /><span>spørgsmål.</span></h2><Link href="/faq" className={styles.textButton}>Se alle spørgsmål <ArrowRight size={16}/></Link></div><div className={styles.questions}>{questions.map(q => <details key={q.title}><summary>{q.title}<Plus size={18}/></summary><p>{q.answer}</p></details>)}</div></section>

      <section className={`${styles.finalCta} ${styles.container}`}><p className={styles.eyebrow}>SE HVAD EMBEDBOT KAN GØRE FOR JER</p><h2>Mere hjælp til kunderne.<br /><span>Mere tid til webshoppen.</span></h2><Link href="/setup" className={styles.button}>Start 14 dage gratis <ArrowRight size={17}/></Link><p>{TRIAL.days} dage gratis. Derefter fra {PLANS.starter.monthlyPriceDkk} kr./md. ekskl. moms. Opsig når som helst.</p></section>
      <footer className={`${styles.footer} ${styles.container}`}><div><Link href="/" className={styles.logo}><Image src={logoImage} alt=""/><span>EmbedBot</span></Link><p>AI-kundeservice. Med plads til mennesker.</p><small>EmbedBot / Axel Bødker Frederiksen<br /><a href="mailto:axel@embedbot.dk">axel@embedbot.dk</a> · <a href="tel:+4591551250">+45 91 55 12 50</a></small></div><div className={styles.footerLinks}><Link href="/support">Kontakt</Link><Link href="/prices">Priser</Link><Link href="/privacy">Privatliv</Link><Link href="/cookies">Cookies</Link><CookiePreferencesButton /><Link href="/terms">Vilkår</Link><Link href="/dpa">Databehandleraftale</Link><Link href="/subprocessors">Leverandører</Link><Link href="/refunds">Betaling og refundering</Link></div></footer>
      {showDemoPrompt && !heroVisible && <aside className={styles.demoPrompt} aria-labelledby="demo-prompt-title">
        <button type="button" className={styles.demoPromptClose} onClick={dismissDemoPrompt} aria-label="Luk demo-invitation"><X size={17} /></button>
        <span className={styles.demoPromptKicker}>PRØV EMBEDBOT</span>
        <h3 id="demo-prompt-title">Vil du se den i aktion?</h3>
        <button type="button" className={styles.button} onClick={openDemo} disabled={demoStatus === "loading"}>Prøv demoen <ArrowRight size={16} /></button>
      </aside>}
    </main>);
}
