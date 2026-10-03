// Axel clarified on 2026-10-03: an automatic end requires a customer agreement.
export const TRIAL={days:14,requiresCard:false,autoConverts:false,autoEnds:false,summary:"14 dage gratis uden betalingskort. Ingen automatisk betaling. Prøven afsluttes kun automatisk, hvis vi har aftalt en slutdato med jer."} as const;
export function agreedTrialEnd(value:unknown,confirmed:unknown,start=Date.now()):string|null{
 if(value===undefined||value===null||value==="")return null;
 if(confirmed!==true||typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))throw new Error("Bekræft kundens aftalte slutdato.");
 const end=new Date(value).getTime();
 if(!Number.isFinite(end)||end<=start||new Date(end).toISOString().slice(0,10)!==value.slice(0,10))throw new Error("Den aftalte slutdato skal være gyldig og ligge i fremtiden.");
 return new Date(end).toISOString();
}
