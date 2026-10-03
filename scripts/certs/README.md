# Supabase CA til databasebackup

supabase-ca-2021.crt er det offentlige CA-certifikat fra **Download certificate** på EmbedBot-projektets Supabase Database Settings-side. Det indeholder ikke en privat nøgle.

Kilde: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Hentet 3. oktober 2026. SHA-256: `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.

En TLS-handshake mod aws-1-eu-central-1.pooler.supabase.com:5432 bestod kæde- og hostnamekontrol med dette CA. Backup-scriptet monterer certifikatet read-only i containeren og bruger verify-full. Ved certifikatrotation skal en ny officiel kilde verificeres og hash opdateres; slå ikke kontrollen fra.
