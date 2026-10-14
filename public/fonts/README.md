# EmbedBot widget fonts

Self-hosted Latin and Latin Extended WOFF2 subsets of Inter, DM Sans, Poppins
and Lora, including Danish characters. These are the same Google Fonts assets
used by the application's existing Next.js font configuration, copied from
its build output into stable widget URLs. The bundled CSS uses separate
`EmbedBot …` family names to avoid collisions with a customer's website.

Only faces used by the selected font are downloaded by the browser.
`/fonts/*` must allow cross-origin reads (configured in next.config.ts).
No Google Fonts request is made by the widget at runtime.

All four families use the SIL Open Font License. See the accompanying OFL
files, retrieved from the official google/fonts repository:
- https://github.com/google/fonts/tree/main/ofl/inter
- https://github.com/google/fonts/tree/main/ofl/dmsans
- https://github.com/google/fonts/tree/main/ofl/poppins
- https://github.com/google/fonts/tree/main/ofl/lora
