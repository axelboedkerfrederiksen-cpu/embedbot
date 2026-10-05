# Chat performance

The chat endpoint overlaps independent work while retaining the subscription,
rate-limit and monthly-allowance checks before AI requests:

- Rate verification and business lookup run together after input validation.
- Intent classification runs alongside integration, support-settings and website
  reads, after access and allowance are verified. Obvious support/order requests
  retain their existing route without classification.
- Public product-page refresh overlaps embedding generation and vector search.
  Refresh still uses the complete imported source and its existing URL checks.
- Request JSON is parsed once, including for progress-stream clients.

Large imported sources use question-related excerpts with a 12,000-character
budget. Recent conversation context helps with follow-ups; page headers and URLs
stay beside their excerpts, and surrounding passages are prioritized to retain
conditions and exceptions. Imports below the budget are unchanged. When no
lexical match is found, the complete source is retained to avoid discarding
knowledge for another language or a paraphrase. This is a lexical selector, not
a semantic retrieval replacement, and answer quality should be checked against
representative customer questions before claiming equivalent coverage. Existing
vector context and freshly read product data are still included separately.

Fixed commerce interface translations are cached by language in each server
process, with at most 32 successful translations. Concurrent requests for the
same language share one translation request. Failed translations are retried on
later requests; neither customer messages nor shop data are cached here.

The widget batches streamed answer rendering to one update per animation frame,
flushes the complete answer when the stream finishes, and cancels queued renders
before an error or structured result can replace the answer.

## Verification

`test/chat-route.test.mjs` exercises the actual route with controlled database and
AI responses. Barriers verify that independent work starts before earlier work
finishes. The tests also check immediate progress, complete streamed text,
persistence and blocked access without AI requests.

`test/chat-context.test.ts` checks late-page policies, product follow-ups, source
URLs, large HTML paragraphs, isolation and fallback when matching is inconclusive.
`test/commerce-copy.test.ts` checks translation reuse, concurrent requests,
mutation isolation and retry after failures. `test/widget-streaming.test.mjs`
checks that 100 fragments in one frame produce one render and one scroll, and
that final flush and cancellation work correctly.

These are deterministic local checks, not a production latency benchmark. To
measure the result in production, compare the same questions and businesses
before and after deployment: time to first answer text, total completion time,
input/output tokens, and answer correctness. Record cold and warm requests
separately, including product lookups and follow-ups. Existing website-load speed
reports measure widget impact on the host page, not chatbot answer latency.

The optimization approach follows the
[official OpenAI latency guidance](https://developers.openai.com/api/docs/guides/latency-optimization)
on overlapping independent work, filtering context and avoiding repeated requests.
