# Workspace insights release

The local workspace's tools are available for customers at
`/dashboard/workspace/<business-id>` through **Arbejdsområde** in the dashboard.
The development-only `/dashboard/lab` remains isolated and shares the new report
component with production. Production uses owner-scoped database data only.

## Changes

- Overview with rolling 7/30-day periods, previous-period comparison, interactive
  daily activity, top page paths, evidence-based next steps and follow-up queues.
- Weekly report uses the same definitions as the overview. A saved report keeps
  its text snapshot; manual generation, download and the existing opt-in email
  schedule remain available. This release does not opt customers into email.
- **Teknik & data** shows P50/P95 AI generation time for completed measured
  answers, measured interrupted streams, source readiness and current/stale tests.
- AI streaming stores `response_ms` and `answer_status` in the existing messages
  JSON metadata. Historical unmeasured answers are excluded from time/error rates.
  No schema change, new table or backfill is required.
- Owner-only exact counts show open tickets and uncontacted leads independently
  of the display limits. Source limits and comparison coverage are explicit.
- CSV exports daily aggregates. JSON exports metrics, coverage and page paths.
  Neither aggregate export includes raw messages, emails or private references.

## Definitions and limits

Periods use `[start, end)` with 7/30 × 24 hours, including Copenhagen daily
buckets across DST. Historical multiple-message records count each user question
at the record's creation time. Counts are not unique visitors or widget sessions.
Feedback counts one voluntary vote per stored record, not a resolution rate.
New leads means created within the period, including subsequently closed leads.
Open queues mean current status. A lead may also have a support case, so the
overview does not present their sum as unique requests.

Up to 1,000 conversation records, 300 tickets, 300 leads, 1,000 feedback rows and
1,000 latest ticket entries are loaded. Exact counts accompany these limits.
When older records could fall inside a selected period, totals are explicitly
labelled a subset. A truncated window ending exactly at the inclusive lower
boundary is conservatively incomplete. Pending/failed replies and open queues
use exact server counts. Runtime coverage metadata is stripped before settings
are saved. Tenant filters and existing auth/Origin guards remain in place.

AI generation time starts immediately before the model request and ends before
the conversation database write. It is not client network latency. Quantiles
use nearest rank and completed streams only. Pre-stream HTTP errors, rejected
requests and unpersisted failures do not enter the stream error rate. Provider
configuration and widget activity are not provider-health or uptime guarantees.
Tests require an expected text and a run since the latest source change to count
as a current pass; a text match alone does not validate factual accuracy.

## Verification

Final full suite: **163 passed, 0 failed, 1 existing opt-in test skipped**.
Isolated production build, TypeScript and focused ESLint checks pass.

- Calculation tests cover boundaries, multi-message records, DST, missing data,
  quantiles, exclusions, new leads, JSON metadata and stale tests.
- Isolated PostgreSQL tests exercise exact tenant counts beyond the 1,000/300
  display limits and verify settings never persist runtime coverage or raw chats.
- Route tests cover normal/interrupted streaming metadata, workspace ownership,
  cross-origin writes, source/test/feedback/lead/reply round trips and mail mocks.
- Browser: 7/30-day switching, selecting a chart day, manual weekly generation,
  text/CSV downloads, technical view and a 390×844 mobile viewport. Mobile page
  width equals viewport width; no horizontal page overflow. No browser console errors observed.
- Read-only production query-shape checks use an empty tenant ID: no customer
  rows are retrieved or changed. Live customer email delivery is not tested.
- Release build uses an isolated index export, excluding unrelated local edits.

Evidence: [overview](test-evidence/workspace/overview.jpg),
[mobile](test-evidence/workspace/mobile.jpg),
[technical view](test-evidence/workspace/technical.jpg).

API reference checked: [Supabase select and exact counts](https://supabase.com/docs/reference/javascript/select).
