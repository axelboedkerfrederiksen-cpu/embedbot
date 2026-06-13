# EmbedBot Deployment & Implementation Guide

## Quick Start

This guide walks you through deploying all security and privacy fixes to production.

---

## STEP 1: Database Migrations (CRITICAL)

### 1.1 Add User ID and RLS Policies

1. Open [Supabase Dashboard](https://app.supabase.com) > SQL Editor
2. Create new query
3. Copy and paste contents of `/sql/add_user_id_and_rls.sql`
4. Run query
5. **Verify:** Check that user_id column exists on businesses table

```sql
-- Verify column exists:
SELECT column_name FROM information_schema.columns 
WHERE table_name='businesses' AND column_name='user_id';
```

### 1.2 Add GDPR Support Tables

1. Create another new query
2. Copy and paste contents of `/sql/add_gdpr_support.sql`
3. Run query
4. **Verify:** Test functions exist

```sql
-- Verify functions exist:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('delete_user_account', 'export_user_data', 'cleanup_expired_conversations');
```

---

## STEP 2: Environment Variables

Add to your `.env` and `.env.production`:

```bash
# Data Retention & Cleanup
CRON_SECRET=your-super-secret-random-string-here-32-chars-min

# Optional: Configure rate limiting salt
RATE_LIMIT_SALT=your-optional-custom-salt

# Optional: Configure OpenAI data retention
# Note: Data retention is disabled by default - no action needed
```

Generate secure CRON_SECRET:
```bash
# On macOS/Linux:
openssl rand -hex 32

# Output: abc123def456... (copy this)
```

---

## STEP 3: Deploy Code

Commit and deploy the following changes:

```bash
git add -A
git commit -m "chore: security hardening and GDPR compliance

- Add RLS policies for data isolation
- Implement account deletion endpoint
- Implement data export endpoint  
- Add conversation deletion endpoint
- Add data retention/cleanup support
- Improve error handling in chat endpoint
- Add security headers
- Add CSRF protection
- Add Privacy Policy and Terms of Service"
```

Deploy to your hosting (Vercel recommended):
```bash
# If using Vercel:
vercel --prod
```

---

## STEP 4: Configure Cron Job

### Option A: Using Vercel Cron (Recommended if on Vercel)

Create `/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the cleanup job at 2:00 AM UTC daily.

### Option B: Using GitHub Actions

Create `.github/workflows/cleanup.yml`:

```yaml
name: EmbedBot Cleanup

on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run cleanup
        run: |
          curl -X POST https://embedbot.dk/api/cron/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option C: Using External Service

Use [cron-job.org](https://cron-job.org) or similar:

```
Method: POST
URL: https://embedbot.dk/api/cron/cleanup
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
```

Schedule: Daily at 2:00 AM UTC

---

## STEP 5: Update Frontend (Optional but Recommended)

### Add Footer with Legal Links

Update `/app/layout.tsx`:

```tsx
import Footer from "./components/footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UniversalBackButton />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

This adds links to Privacy Policy and Terms of Service in footer.

### Update Metadata

Update `/app/layout.tsx` metadata:

```tsx
export const metadata: Metadata = {
  title: "EmbedBot - Intelligent Chatbot for E-Commerce",
  description: "Add an AI-powered chatbot to your website in minutes. Reduce support tickets and increase sales.",
  keywords: ["chatbot", "AI", "e-commerce", "customer support"],
  openGraph: {
    title: "EmbedBot",
    description: "Intelligent Chatbot for E-Commerce",
    type: "website",
  },
};
```

---

## STEP 6: Testing & Verification

### Test Account Deletion

```bash
# 1. Create test account at https://embedbot.dk/setup
# 2. Create test business
# 3. Test deletion:

curl -X POST https://embedbot.dk/api/auth/delete-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-confirm-deletion: yes-delete-my-account"

# Should return:
# {"success":true, "message":"..."}
```

### Test Data Export

```bash
curl -X GET https://embedbot.dk/api/auth/export-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return JSON file with businesses and conversations
```

### Test Cleanup Cron

```bash
curl -X POST https://embedbot.dk/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return:
# {"success":true, "deleted_count": 0, "timestamp": "2026-..."}
```

### Test RLS Policies

1. Create Account A with Business A
2. Create Account B with Business B
3. Login as Account A
4. Try to access Account B's business in database:

```typescript
// This should fail (return null):
const { data } = await supabase
  .from("businesses")
  .select()
  .eq("id", "business-b-id")
  .single();
```

### Test Chat Endpoint

```bash
# Should work:
curl -X POST https://embedbot.dk/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "business_id": "YOUR_BUSINESS_ID"
  }'

# Should fail with 404 (non-existent business):
curl -X POST https://embedbot.dk/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "business_id": "nonexistent-id"
  }'
```

---

## STEP 7: Monitoring Setup (Recommended)

### Install Sentry

```bash
npm install @sentry/nextjs
```

Create `/instrumentation.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });
  }
}
```

Update `next.config.ts`:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const config = { /* ... */ };

export default withSentryConfig(config, {
  org: "your-org",
  project: "embedbot",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
```

Set environment variable in Vercel:
```
SENTRY_DSN=https://YOUR_SENTRY_KEY@sentry.io/PROJECT_ID
```

---

## STEP 8: Verification Checklist

### Database
- [ ] User ID column added to businesses table
- [ ] RLS policies created and enabled
- [ ] GDPR support tables and functions exist
- [ ] Cleanup function can be called

### Application
- [ ] All new API endpoints working
- [ ] Chat endpoint validates business exists
- [ ] Error messages are user-friendly
- [ ] Security headers are set
- [ ] Legal pages are accessible

### Operations
- [ ] CRON_SECRET configured
- [ ] Cron job scheduled and tested
- [ ] Monitoring set up (Sentry)
- [ ] Error logs visible
- [ ] Backup system operational

### Legal/Privacy
- [ ] Privacy Policy page accessible at /privacy
- [ ] Terms of Service page accessible at /terms
- [ ] Footer shows legal links
- [ ] Policy content matches actual implementation

---

## STEP 9: Launch

1. **Final Testing:** Test all flows with production data
2. **Backup:** Ensure backup is current
3. **Monitoring:** Verify monitoring system is working
4. **Deploy:** Push to production
5. **Monitor:** Watch error logs for first 24 hours
6. **Announce:** Update website with privacy/legal info

---

## Common Issues

### "Column user_id does not exist"

**Cause:** SQL migration not run yet  
**Fix:** Run `/sql/add_user_id_and_rls.sql` in Supabase

### "Policy does not exist" error

**Cause:** RLS policies not created  
**Fix:** Ensure migration ran successfully, check Supabase RLS tab

### Cron job doesn't run

**Cause:** CRON_SECRET not set or wrong endpoint  
**Fix:** 
1. Verify CRON_SECRET env var set
2. Test endpoint with correct secret
3. Check logs for 401 errors

### Users can still see each other's data

**Cause:** RLS policies not enforced  
**Fix:**
1. Check that `enable row level security` ran
2. Verify user_id is not NULL for businesses
3. Test RLS with `authenticated` role in Supabase

### Rate limiting not working

**Cause:** IP header not coming through  
**Fix:** Verify X-Forwarded-For header from reverse proxy (Vercel does this)

---

## Rollback Plan

If something goes wrong:

1. **Revert code:** `git revert [commit-hash]`
2. **Keep database changes:** Don't revert SQL (data safe to keep)
3. **Delete accounts still work:** Function doesn't depend on new code
4. **Restore from backup:** If data corrupted (Supabase can restore)

**Estimated rollback time:** 5 minutes

---

## Support

For issues with this deployment:

1. Check SECURITY_AUDIT_REPORT.md for detailed documentation
2. Review error logs (Sentry dashboard)
3. Test endpoints individually with curl
4. Verify all SQL migrations ran
5. Contact: axel@embedbot.dk

---

## Success Criteria

✅ All tests passing  
✅ No errors in monitoring  
✅ Cron job runs daily  
✅ Users can delete accounts  
✅ Users can export data  
✅ RLS policies enforced  
✅ Security headers set  
✅ Legal pages accessible  

**You're ready to launch! 🚀**
