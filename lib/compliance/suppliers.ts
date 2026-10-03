import register from "./supplier-register.json";
export type Supplier = { provider:string; legalName:string; service:string; purpose:string; data:string; location:string; role:string; transfer:string; scope:string; reviewedAt:string; information:string; evidence:string; sources:string[][] };
export const SUPPLIERS: Supplier[] = register;
