// Standard trial purchased through Stripe; individually agreed manual pilots remain separate.
export const TRIAL = { days: 14, requiresCard: true, autoConverts: true, autoEnds: false, summary: "14 dage gratis med kortregistrering hos Stripe. Første betaling trækkes automatisk efter 14 dage, medmindre du opsiger inden. Herefter fornyes abonnementet månedligt. Betalingen sker uanset, om du modtager en mail." } as const;
export function agreedTrialEnd(value:unknown,confirmed:unknown,start=Date.now()):string|null{
 if(value===undefined||value===null||value==="")return null;
 if(confirmed!==true||typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))throw new Error("Bekræft kundens aftalte slutdato.");
 const end=new Date(value).getTime();
 if(!Number.isFinite(end)||end<=start||new Date(end).toISOString().slice(0,10)!==value.slice(0,10))throw new Error("Den aftalte slutdato skal være gyldig og ligge i fremtiden.");
 return new Date(end).toISOString();
}
