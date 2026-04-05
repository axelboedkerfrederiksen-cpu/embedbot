# EmbedBot

EmbedBot er en Next.js-app, der lader virksomheder oprette og indlejre en AI-kundeservicechatbot på deres egen hjemmeside.

Den indeholder:

- Onboarding- og opsætningsflow for virksomheder
- Supabase-baseret lagring af virksomhedsdata og samtaler
- OpenAI-drevet ingest og chatsvar
- Indlejrbar widget-script (`/widget.js`) til eksterne sider
- API-endpoints til admin- og virksomhedsadministration

## Teknologistak

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- OpenAI API
- Resend (transaktionelle e-mails)
- Tailwind CSS 4

## Lokal udvikling

1. Installer afhængigheder:

```bash
npm install
```

2. Opret `.env.local` i projektets rodmappe:

```env
# Klient + auth
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-side Supabase-adgang
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# AI
OPENAI_API_KEY=

# E-mail
RESEND_API_KEY=
ADMIN_EMAIL=

# App URL (bruges af server routes)
NEXT_PUBLIC_APP_URL=

# Admin-login (server-only)
ADMIN_PASSWORD=

# Valgfri salt til hashing af rate-limit IP
RATE_LIMIT_SALT=
```

3. Start udviklingsserveren:

```bash
npm run dev
```

4. Åbn:

`http://localhost:3000`

## Tilgængelige scripts

- `npm run dev` - start lokal udviklingsserver
- `npm run build` - lav produktionsbuild
- `npm run start` - kør produktionsserver
- `npm run lint` - kør ESLint

## Kerneflow

1. Virksomheden udfylder opsætningsformularen i appen.
2. Data gemmes i Supabase (`businesses`) via API-ruter.
3. Aktivering udløser website-ingest (`/api/ingest`) og embeddings i `documents`.
4. Hjemmesiden indsætter embed-script:

```html
<script src="https://YOUR_DOMAIN/widget.js?id=BUSINESS_ID"></script>
```

5. Widgeten sender brugerbeskeder til `/api/chat` med `business_id`.
6. Chat-ruten laver vector-opslag via Supabase RPC (`match_documents`) og spørger OpenAI om det endelige svar.

## Krav til Supabase

Dette repository indeholder SQL til `conversations` i [sql/create_conversations_table.sql](sql/create_conversations_table.sql).
Rate limiting til chat kræver også [sql/create_chat_rate_limit.sql](sql/create_chat_rate_limit.sql).

Du skal også have følgende databaseobjekter, som appen bruger:

- `businesses`-tabel
- `documents`-tabel med vector/embedding-lagring
- `match_documents` RPC-funktion til lighedssøgning

Chat-ruten indsætter bruger/bot-udvekslinger i `conversations`, så dashboardet kan vise historik.

## Vigtige endpoints

- `POST /api/business-draft` - gem onboarding-kladde
- `POST /api/submit` - færdiggør onboarding + send intern ordremail
- `POST /api/activate` - ingest virksomhedens hjemmeside og markér som aktiveret
- `POST /api/ingest` - hent websitets tekst og gem embeddings
- `POST /api/chat` - svar fra chatbot under brug
- `GET /api/widget-config?id=...` - hent branding/velkomst-konfiguration til widget
- `GET|PUT|DELETE /api/admin/businesses` - adminstyring af virksomheder

## Bemærkninger om widget

- Hovedscriptet til indlejring leveres fra `public/widget.js`.
- `widget.js` læser business-id fra URL-query-parameteren `id`.
- Den understøtter valgfrie script-attributter:
	- `data-name`
	- `data-primary-color`
	- `data-secondary-color`
	- `data-fab-color`
	- `data-font`
- Hvis de er til stede, kan API-konfigurationen fra `/api/widget-config` overskrive standardværdier.

## CORS og headers

`next.config.ts` sætter:

- `Access-Control-Allow-Origin: *` for `/widget.js` og `/api/:path*`
- JavaScript content-type-header for `/widget.js`

Det gør det muligt at indlejre widgeten og kalde API'et fra eksterne domæner.

## Deployment

Deploy på Vercel (anbefalet):

1. Importér repository i Vercel
2. Tilføj alle environment variables fra `.env.local`
3. Sørg for at Supabase-skema og RPC er oprettet
4. Deploy

Efter deploy skal du bruge dit deployede domæne i embed-scriptet.
