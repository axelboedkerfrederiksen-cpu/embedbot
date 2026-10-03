# Admin audit repair — 2026-10-03

Axel explicitly approved creating the missing production audit table. The `admin_audit_repair` migration was applied successfully to the linked Supabase project using `admin-audit-repair.sql`.

Verified in production:

- RLS enabled.
- No SELECT/INSERT/UPDATE/DELETE privileges for anon or authenticated browser roles.
- service_role can insert an `admin.read` event. The verification transaction was rolled back, leaving no synthetic audit event.

Admin browser verification still showed the MFA/login screen. Successful admin access and enrollment for axel@embedbot.dk remain unconfirmed. No authentication factors, allowlists, or passwords were changed by this repair.

After publishing the login-flow fix (64c52f3), the live admin page displayed the active Gmail account and `Ikke autoriseret.` The email typed in the old password form did not change that existing session. The user must sign out of that session and sign in with the intended Microsoft admin account before continuing MFA setup. The live page now exposes the account and server error and hides the password form while signed in.

The earlier `20261002183142_compliance_phase_1_2.sql` migration also creates this table. Reconcile that pending migration with the production repair before applying it; do not execute it blindly or mark the entire earlier migration as applied. The rest of the compliance schema remains outside this repair.
