# Chatbot appearance verification — 14 October 2026

The appearance editor is shared by onboarding and Dashboard → Udseende. It
provides three restrained presets, independent header/message/launcher colors,
four self-hosted fonts, bitmap logo upload and removal, and collapsible outline
and opacity controls. The preview runs the actual public widget in an iframe;
its sample messages never call chat, commerce or analytics APIs.

## Verified

- Production build: `EMBEDBOT_LOCAL_DIST_DIR=.next-workspace-appearance-build npm run build` passed.
- Full suite: `npm test` — **153 passed, 0 failed, 1 skipped (154 total)**.
  The skipped test is the pre-existing opt-in public HTTPS website-import test.
- `npx tsc --noEmit --incremental false` passed.
- ESLint passed for the edited TS/TSX routes, components and appearance module.
- `node --check public/widget.js` and `git diff --check` passed.
- Read-only production schema check selected the 11 required design columns with
  `limit(0)`: all exist; no customer rows were retrieved or modified.

## Data flow

`test/widget-appearance-routes.test.mjs` executes the real draft and public-config
handlers against isolated PostgreSQL via the existing Supabase test adapter:

- Save → database → public widget config preserves font, color, uploaded logo,
  fractional outline width, zero outline opacity and widget opacity.
- Saving another section preserves the logo. Explicit removal clears it.
- Existing `logo_url` stores uploaded data URLs. The optional `logo_data_url`
  and `logo_file_name` columns are not required (the production schema lacks
  `logo_data_url`). No database migration is required.
- Native database booleans and numeric zero values survive serialization.
- Missing optional columns do not discard supported design settings. Missing
  required design columns produce a save failure rather than silent data loss.
- Invalid branding and edits by a different tenant are rejected.

`test/widget-appearance.test.mjs` checks valid presets, legacy launcher-color
fallback, fractional and zero outlines, malformed values, unsupported/oversized
logo sources and font choices. Automatic text color meets 4.5:1 contrast on
4,096 RGB samples at full opacity. Transparent white logos receive a dark
backdrop; dark logos receive a white backdrop, without recoloring pixels.

The existing widget compliance test now explicitly checks self-hosted font CSS
and absence of Google font URLs, while retaining AI disclosure, privacy links
and no persistent visitor storage checks.

## Browser checks

Performed in Chrome on the local development dashboard with `preview=1`:

- All three presets update the real widget; all four font choices are available.
  Poppins, Inter, DM Sans and Lora were rendered during testing; computed family
  switches to the corresponding isolated `EmbedBot …` font family.
- Light/dark preview backgrounds and narrow preview mode work.
- Outline controls disable when off; keyboard controls correctly reach 0, 0.5
  and 6 px, and 0/100% outline visibility.
- Logo upload decodes a valid multicolor PNG, retains its colors (`filter:none`),
  fits it inside a 40×32 area and survives preset changes. A corrupt PNG displays
  an error and preserves the prior working logo. Removal hides the logo.
- A transparent white PNG on a white header renders against `rgb(35,35,33)`.
- Preview messages work with Send and Enter. Close/reopen and New chat work.
- The demo Save button confirms explicitly that only the demo has changed.
- A 390×844 viewport was inspected; the editor stacks and the widget fits its
  preview viewport without horizontal content overflow. No real mobile device
  or on-screen mobile keyboard was tested.

Evidence: [desktop](test-evidence/appearance/desktop.jpg),
[mobile](test-evidence/appearance/mobile.jpg),
[white logo](test-evidence/appearance/white-logo.jpg).

The Chrome session reports a React hydration warning for the browser-extension
attribute `bis_skin_checked` on existing page wrappers. This is separate from
widget behavior; the production build and TypeScript checks pass. Native file
selection was used because the extension's automated file-upload permission
was disabled. No browser permissions were changed.

## Release scope

Changes are local and have not been published. No customer branding was edited
in production. External HTTPS logos remain supported; if their origin forbids
canvas pixel reads, the widget uses the neutral white logo backdrop. Uploaded
PNG/JPG/WebP logos can be sampled locally for automatic backdrop selection.
