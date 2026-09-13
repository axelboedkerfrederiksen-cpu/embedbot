# OAuth-login: Google og Microsoft

Appen er klar til socialt login med Google og Microsoft (Azure/Entra ID). Der mangler kun at forbinde hver provider i Supabase med jeres egne OAuth-oplysninger.

## Fælles Supabase-opsætning

I **Supabase Dashboard → Authentication → URL Configuration** skal Site URL være:

`https://www.embedbot.dk`

Tilføj desuden følgende Redirect URL'er:

- `https://www.embedbot.dk/auth/callback`
- `https://embedbot.dk/auth/callback`
- `http://localhost:3000/auth/callback`

## Google

1. Opret en *Web application* under Google Cloud → Google Auth Platform.
2. Tilføj både `https://www.embedbot.dk` og `https://embedbot.dk` som Authorized JavaScript origins.
3. Kopiér callback-URL'en fra **Supabase Dashboard → Authentication → Providers → Google** til Google Cloud under Authorized redirect URIs.
4. Indsæt Google Client ID og Client Secret i Supabase, og slå provideren til.

Brug scopes `openid`, `email` og `profile`. Undgå ekstra scopes, medmindre de er nødvendige.

## Microsoft

1. Opret en App registration i Microsoft Entra ID.
2. Vælg en passende kontotype; **Accounts in any organizational directory and personal Microsoft accounts** passer normalt til EmbedBot.
3. Tilføj Supabase-callback-URL'en som Web Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Opret en Client Secret og indsæt **Value** (ikke Secret ID), Client ID og tenant-URL i **Supabase Dashboard → Authentication → Providers → Azure**.
5. Slå Azure-provideren til. Appen anmoder om `email`-scope, som Supabase kræver for Microsoft-login.

For ekstra sikkerhed anbefaler Microsoft/Supabase at tilføje `xms_edov` som optional claim i Entra-appens manifest, så uverificerede e-maildomæner kan identificeres.
