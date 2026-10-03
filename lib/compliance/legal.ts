import publication from "./dpa-publication.json" with { type: "json" };
import terms from "./terms-publication.json" with { type: "json" };
export const TERMS = terms;
export const DPA = publication;
export const LEGAL_DOCUMENTS = [TERMS,DPA];
