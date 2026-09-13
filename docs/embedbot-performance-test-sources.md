# EmbedBot performance test sources

## Purpose

These reports are project sources for future work about EmbedBot's effect on website performance. They document a desktop comparison of the performance test page with and without the EmbedBot widget.

## Source reports

- Online test: `/Users/axel/Desktop/Embed/EmbedBot speed test online.docx`
- Local test: `/Users/axel/Desktop/Embed/Embedbot speed test Offline.docx`
- Test page: `/Users/axel/embedbot/public/performance-test.html`

## Main result from the online test

The online test was run on Netlify in an incognito browser with 10 runs without EmbedBot and 10 runs with EmbedBot. The comparison used the median:

| Metric | Without EmbedBot | With EmbedBot | Difference |
| --- | ---: | ---: | ---: |
| FCP | 100 ms | 100 ms | 0 ms |
| LCP | 100 ms | 100 ms | 0 ms |
| INP | 24 ms | 24 ms | 0 ms |
| CLS | 0 | 0 | 0 |
| TTFB | 46.4 ms | 43.4 ms | -3 ms |

### Interpretation

In this online desktop test, no negative effect was measured on FCP, LCP, INP, or CLS. TTFB was effectively unchanged and was 3 ms lower with the widget. The result should be described as applying to this test page, browser, device, and network conditions; it is not a guarantee for every customer website.

## Local test

The local test was run through `file://` with three runs per variant. It showed very low values, such as FCP/LCP around 52–68 ms and TTFB around 3.6–7.8 ms. These values are not representative of a public website because the test page itself was loaded locally. Use this report only as a local technical check, not as the primary customer-facing evidence.

## Limitations

- `EmbedBot bytes` was reported as 0 KB because the browser did not expose cross-origin transfer sizes to the page. Use Chrome DevTools or WebPageTest for the actual payload size.
- The test page is simpler than a typical customer website.
- The reports cover desktop only. A stronger evidence base should include mobile, slower 4G, and several realistic customer sites.
- The online report is the preferred source for customer communication.
