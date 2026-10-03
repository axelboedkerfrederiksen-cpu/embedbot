import versions from "./legal-documents.json" with { type: "json" };
export const LEGAL_DOCUMENTS = versions;
export const TERMS = versions.find(document => document.slug === "terms")!;
export const DPA = versions.find(document => document.slug === "dpa")!;
