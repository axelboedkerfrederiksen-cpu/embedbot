"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Maximize, Pause, Play, RotateCcw } from "lucide-react";
import styles from "../landing.module.css";
const scenes = [
    { label: "Produkter", question: "Har I weekendtasken på lager, og hvad koster den?", answer: "Ja, Weekendtaske – Canvas står som på lager lige nu og koster 599 kr. inkl. moms. Lagerstatus kan ændre sig, så den er ikke en garanti for køb eller levering." },
    { label: "Supportsag", question: "Kan I hjælpe? Lynlåsen på min taske er gået i stykker.", answer: "Jeg hjælper dig med at sende din henvendelse videre til webshoppen." },
    { label: "Retur", question: "Hvordan returnerer jeg en vare?", answer: "Du har 30 dages returret. Kontakt os på", contact: "kundeservice@preview.example", ending: ", så hjælper vi dig videre med returneringen." },
];

function ProductThumbnail() {
    return <svg viewBox="0 0 76 88" role="img" aria-label="Illustration af en beige weekendtaske">
      <rect width="76" height="88" fill="#e8e0d1" />
      <path d="M25 35V26c0-17 26-17 26 0v9" fill="none" stroke="#796047" strokeWidth="3" />
      <path d="M13 34Q38 29 63 34L67 67Q38 73 9 67Z" fill="#b59b76" />
      <path d="M13 34L10 64M63 34l3 30" stroke="#927657" strokeWidth="2" />
      <path d="M26 33v35M50 33v35" stroke="#796047" strokeWidth="4" />
      <path d="M28 50h20v10H28z" fill="#c4b18f" />
      <path d="M14 35h48" stroke="#7f684c" strokeWidth="1.5" />
    </svg>;
}
export default function ChatPreview() {
    const root = useRef<HTMLDivElement>(null);
    const inView = useInView(root, { amount: 0.25 });
    const reducedMotion = useReducedMotion();
    const [paused, setPaused] = useState(false);
    const [visible, setVisible] = useState(true);
    const [scene, setScene] = useState(0);
    const [stage, setStage] = useState(0);
    const [cycle, setCycle] = useState(0);
    const current = scenes[scene];
    useEffect(() => {
        const update = () => setVisible(!document.hidden);
        update();
        document.addEventListener("visibilitychange", update);
        return () => document.removeEventListener("visibilitychange", update);
    }, []);
    useEffect(() => {
        if (reducedMotion || paused || !inView || !visible)
            return;
        const lastStage = scene === 1 ? 6 : 3;
        const delay = scene === 1 ? [900, 900, 1500, 1600, 3200, 3000, 5000][stage] : [900, 900, 1500, 6500][stage];
        const timer = window.setTimeout(() => {
            if (stage < lastStage)
                setStage(stage + 1);
            else {
                setScene((scene + 1) % scenes.length);
                setStage(0);
                setCycle(c => c + 1);
            }
        }, delay);
        return () => window.clearTimeout(timer);
    }, [stage, scene, cycle, paused, inView, visible, reducedMotion]);
    const shownStage = reducedMotion ? Math.max(stage, scene === 1 ? 4 : 3) : stage;
    const showingSupport = scene === 1 && shownStage >= 3;
    const transition = { duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };
    const selectScene = (index: number) => { setScene(index); setStage(reducedMotion || paused ? (index === 1 ? 4 : 3) : 0); setCycle(c => c + 1); };
    return <div className={styles.previewWrap} ref={root}>
    <div className={styles.previewLabel}><span>EMBEDBOT I AKTION</span><span>ILLUSTRATIVT EKSEMPEL</span></div>
    <div className={styles.preview}>
      <div className={styles.previewTop}><span className={styles.storeName}>Preview<span>WEBSHOP</span></span><div className={styles.sceneTabs} role="group" aria-label="Vælg samtaleeksempel">{scenes.map((item, i) => <button key={item.label} aria-pressed={scene === i} onClick={() => selectScene(i)}>{item.label}</button>)}</div></div>
      <div className={styles.storeBackdrop} aria-hidden="true"><div className={styles.storeLine}/><div className={styles.storeProducts}><div /><div /><div /></div><div className={styles.storeLineShort}/></div>
      <div className={styles.chatWindow}>
        <div className={styles.chatHeader}><div><strong>Preview ChatBot</strong><div style={{fontSize:11,fontWeight:500}}>AI-assistent</div></div><Maximize size={15} aria-hidden="true" /></div>
        <div className={styles.chatBody}>
          {!showingSupport && <><p className={styles.chatGreeting}>Hejsa! Jeg er Previews chatbot 😊</p><span className={styles.messageTime}>12.30</span></>}
          <AnimatePresence mode="wait"><motion.div key={`${scene}-${cycle}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -5 }} transition={transition}>
            {shownStage >= 1 && !showingSupport && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition}><p className={styles.userMessage}>{current.question}</p><span className={`${styles.messageTime} ${styles.userTime}`}>12.30</span></motion.div>}
            {shownStage === 2 && <div className={styles.typing} aria-label="Assistenten skriver"><span /><span /><span /></div>}
            {shownStage >= 3 && <motion.div className={styles.answer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
              <p>{current.answer}{"contact" in current && <> <strong>{current.contact}</strong>{current.ending}</>}</p>
              {scene === 0 && <><span className={styles.productLink}>Se produktet</span><div className={styles.productCard}><ProductThumbnail /><span>Weekendtaske – Canvas</span></div></>}
              {showingSupport && <AnimatePresence mode="wait"><motion.div key={shownStage >= 6 ? "sent" : shownStage >= 5 ? "review" : "form"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition} className={styles.supportCard}>
                {shownStage >= 6 ? <><strong>Sagsnummer: PREVIEW-1042</strong><p>Din henvendelse er sendt videre til webshoppen.</p><p>Sagen er gemt i webshoppens dashboard.</p><span className={styles.supportSuccess}>✓ Henvendelse oprettet</span></> : shownStage >= 5 ? <><strong>Kontrollér din henvendelse</strong><p>Lynlåsen på min weekendtaske er gået i stykker. Kan I hjælpe?</p><p>Kontaktmail: kunde@example.org</p><p>Ordrenummer: 1042</p><p>Gennemse oplysningerne, inden du sender.</p><button type="button" className={styles.supportAction} onClick={() => setStage(6)}>Send henvendelse</button><button type="button" className={styles.supportEdit} onClick={() => setStage(4)}>Ret henvendelsen</button></> : <>
                  <label className={styles.supportField}><span>Hvad skal virksomheden hjælpe med?</span><textarea tabIndex={-1} readOnly value={shownStage >= 4 ? "Lynlåsen på min weekendtaske er gået i stykker. Kan I hjælpe?" : ""} /></label>
                  <label className={styles.supportField}><span>Din kontaktmail</span><input tabIndex={-1} readOnly value={shownStage >= 4 ? "kunde@example.org" : ""} /></label>
                  <label className={styles.supportField}><span>Ordrenummer (valgfrit)</span><input tabIndex={-1} readOnly value={shownStage >= 4 ? "1042" : ""} /></label>
                  <div className={styles.supportConsent}><span aria-hidden="true">{shownStage >= 4 ? "✓" : ""}</span>Vedlæg de seneste beskeder fra denne samtale</div>
                  <button type="button" className={styles.supportAction} onClick={() => setStage(5)}>Gennemse henvendelsen</button>
                </>}
              </motion.div></AnimatePresence>}
              <span className={styles.messageTime}>12.30</span>
            </motion.div>}
          </motion.div></AnimatePresence>
        </div>
        <div className={styles.chatComposer}>
          <div className={styles.chatInput} aria-hidden="true"><span>Skriv dit spørgsmål…</span><ArrowRight size={15} /></div>
          <div className={styles.powered}>Drevet af EmbedBot · <span>Privatliv</span></div>
          <span className={styles.supportShortcut}>Opret en supportsag</span>
        </div>
      </div>
      <div className={styles.previewBottom}><span><i /> Hjælp, også efter lukketid</span><div><button aria-label="Genstart samtaleeksempel" onClick={() => { setStage(reducedMotion || paused ? (scene === 1 ? 4 : 3) : 0); setCycle(c => c + 1); }}><RotateCcw size={14}/></button>{!reducedMotion && <button aria-label={paused ? "Afspil animation" : "Sæt animation på pause"} onClick={() => setPaused(!paused)}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>}</div></div>
    </div>
    <p className={styles.previewCaption}>Jeres indhold. Jeres tone. Hjælp direkte på siden.</p>
  </div>;
}
