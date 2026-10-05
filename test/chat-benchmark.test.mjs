import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeConfig, statistics, summarize, measureReply, runBenchmark, resultsCsv } from "../public/chat-benchmark-core.mjs";

const businessId = "11111111-1111-1111-1111-111111111111";
const config = extras => normalizeConfig({ businessId, endpoint: "https://example.com", prompts: ["Hej"], delayMs: 0, ...extras });
const eventsResponse = events => new Response(events.map(event => JSON.stringify(event)).join("\n"), { headers: { "Content-Type": "application/x-ndjson" } });

test("statistics reproduce the user's old and new measurements and handle even or empty sets", () => {
  const old = statistics([7500, 4200, 4500, 3440, 2900]);
  const updated = statistics([5300, 3100, 3000, 3200, 3140]);
  assert.equal(old.average, 4508); assert.equal(old.median, 4200);
  assert.equal(updated.average, 3548); assert.equal(updated.median, 3140);
  assert.equal(statistics([1000, 2000, null, NaN]).median, 1500);
  assert.equal(statistics([]).average, null);
  assert.equal(old.p95, 7500);
});

test("configuration accepts a widget link, rejects malformed input and counts warmups against the request limit", () => {
  const value = config({ businessId: `https://shopbot.example/widget.js?id=${businessId}`, runs: 5, warmups: 1 });
  assert.equal(value.endpoint, "https://shopbot.example/api/chat");
  assert.equal(value.requestCount, 6);
  for (const extra of [{ businessId: "wrong" }, { endpoint: "file:///tmp/data" }, { endpoint: "https://user:secret@example.com" }, { prompts: [] }, { prompts: [{}] }, { runs: 1.5 }, { runs: 0 }, { runs: 50, warmups: 1 }]) {
    assert.throws(() => config(extra));
  }
});

test("first reply ignores status and references, and waits for a complete Unicode text event", async () => {
  let clock = 0, index = 0;
  const encoder = new TextEncoder();
  const text = encoder.encode('{"type":"text","text":"Blød uld"}\n');
  const unicode = text.indexOf(0xc3);
  const steps = [
    [10, encoder.encode('{"type":"status","stage":"thinking"}\n')],
    [20, encoder.encode('{"type":"reference","id":"private","token":"never-export"}\n')],
    [40, text.slice(0, unicode + 1)],
    [80, text.slice(unicode + 1)],
  ];
  const stream = new ReadableStream({ pull(controller) {
    if (index === steps.length) { clock = 200; controller.close(); return; }
    const [time, bytes] = steps[index++]; clock = time; controller.enqueue(bytes);
  } }, { highWaterMark: 0 });
  const result = await measureReply(config(), "Hej", {
    now: () => clock,
    fetchImpl: async () => new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.firstReplyMs, 80);
  assert.equal(result.completeMs, 200);
  assert.equal(result.text, "Blød uld");
  assert.equal(JSON.stringify(result).includes("never-export"), false);
});

test("plain streams and structured JSON or progress results are measured as actual answers", async () => {
  for (const response of [
    new Response("Hej!"),
    Response.json({ kind: "support", text: "Udfyld formularen." }),
    eventsResponse([{ type: "status", stage: "thinking" }, { type: "result", data: { kind: "products", text: "Her er produkterne." } }]),
  ]) {
    const result = await measureReply(config(), "Hej", { fetchImpl: async () => response });
    assert.equal(result.ok, true);
    assert.ok(result.firstReplyMs >= 0);
    assert.ok(result.completeMs >= result.firstReplyMs);
    assert.ok(result.text.length > 0);
  }
});

test("HTTP errors, error events, malformed streams and empty replies are failures", async () => {
  for (const response of [
    Response.json({ error: "Rate limit ramt: maks 50 beskeder pr. dag." }, { status: 429 }),
    eventsResponse([{ type: "error", message: "Starter-planen har brugt månedens 1.000 AI-svar." }]),
    new Response("not JSON\n", { headers: { "Content-Type": "application/x-ndjson" } }),
    eventsResponse([{ type: "status", stage: "thinking" }]),
  ]) {
    const result = await measureReply(config(), "Hej", { fetchImpl: async () => response });
    assert.equal(result.ok, false);
    assert.equal(result.completeMs, null);
    assert.ok(result.error);
  }
});

test("rounds interleave prompts, warmups are excluded, and every request starts a fresh chat", async () => {
  const sent = [], sessions = new Set();
  const report = await runBenchmark(config({ prompts: ["Hej", "Returpolitik?"], runs: 2, warmups: 1 }), {
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      assert.deepEqual(body.history, []);
      assert.equal(body.stream_events, true);
      assert.match(body.session, /^[a-f\d]{64}$/);
      assert.ok(!sessions.has(body.session)); sessions.add(body.session);
      sent.push(body.message);
      return eventsResponse([{ type: "text", text: "Svar" }]);
    },
  });
  assert.deepEqual(sent, ["Hej", "Returpolitik?", "Hej", "Returpolitik?", "Hej", "Returpolitik?"]);
  assert.equal(report.records.length, 6);
  assert.equal(report.summary[0].successes, 2);
  assert.deepEqual(report.records.filter(record => !record.warmup).map(record => record.run), [1, 1, 2, 2]);
  assert.equal(report.completed, true);
});

test("failed calls are reported without lowering the average, and quotas stop further requests", async () => {
  const summary = summarize([
    { promptIndex: 0, warmup: true, ok: true, firstReplyMs: 100, completeMs: 200 },
    { promptIndex: 0, warmup: false, ok: false, firstReplyMs: null, completeMs: null },
    { promptIndex: 0, warmup: false, ok: true, firstReplyMs: 2000, completeMs: 4000 },
  ], ["Hej"])[0];
  assert.equal(summary.failures, 1); assert.equal(summary.successes, 1);
  assert.equal(summary.firstReplyMs.average, 2000);
  let calls = 0;
  const report = await runBenchmark(config({ runs: 5 }), { fetchImpl: async () => {
    calls++;
    return eventsResponse([{ type: "error", message: "Rate limit ramt: maks 50 beskeder pr. dag." }]);
  } });
  assert.equal(calls, 1); assert.equal(report.completed, false);
  assert.match(report.stopReason, /Rate limit/);
  assert.equal(report.summary[0].firstReplyMs.average, null);
});

test("timeouts and a stop request abort pending work", async () => {
  const waitUntilAborted = async (_url, request) => new Promise((_, reject) => {
    request.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
  const timedOut = await measureReply(config({ timeoutMs: 100 }), "Hej", { fetchImpl: waitUntilAborted });
  assert.equal(timedOut.errorCategory, "timeout");
  const inFlight = new AbortController();
  const pending = measureReply(config(), "Hej", { fetchImpl: waitUntilAborted, signal: inFlight.signal });
  inFlight.abort();
  assert.equal((await pending).errorCategory, "cancelled");
  const controller = new AbortController();
  let calls = 0;
  const report = await runBenchmark(config({ runs: 5 }), { signal: controller.signal, fetchImpl: async () => {
    calls++; return eventsResponse([{ type: "text", text: "Hej!" }]);
  }, onResult: () => controller.abort() });
  assert.equal(calls, 1);
  assert.equal(report.completed, false);
  assert.equal(report.records[0].ok, true);
  assert.match(report.stopReason, /stoppet/);
});

test("CSV escapes quotes, line breaks and spreadsheet formulas without exporting references", () => {
  const csv = resultsCsv({ records: [{ prompt: '=HYPERLINK("https://example.com")', run: 1, warmup: false, ok: true, firstReplyMs: 1234, completeMs: 2000, kind: "text", httpStatus: 200, error: null, text: "Et svar,\nmed ny linje" }] });
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.com""\)"/);
  assert.match(csv, /"1.2340","2.0000"/);
  assert.match(csv, /"Et svar,\nmed ny linje"/);
});

test("CLI executes against a local streamed endpoint and writes complete JSON and CSV reports", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "embedbot-benchmark-"));
  let calls = 0;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    assert.equal(input.business_id, businessId);
    assert.equal(input.stream_events, true); calls++;
    response.writeHead(200, { "Content-Type": "application/x-ndjson" });
    response.write('{"type":"status","stage":"thinking"}\n');
    setTimeout(() => { response.write('{"type":"text","text":"Hej!"}\n'); response.end(); }, 15);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const prompts = join(temporary, "prompts.json"), output = join(temporary, "result");
    await writeFile(prompts, JSON.stringify(["Hej", "Hvad tilbyder I?"]));
    const script = fileURLToPath(new URL("../scripts/benchmark-chat.mjs", import.meta.url));
    await promisify(execFile)(process.execPath, [script, "--business-id", businessId, "--endpoint", `http://127.0.0.1:${server.address().port}`, "--prompts", prompts, "--runs", "2", "--delay-ms", "0", "--out", output, "--label", "Lokal test"], { timeout: 10000 });
    const report = JSON.parse(await readFile(output + ".json", "utf8"));
    assert.equal(calls, 4); assert.equal(report.completed, true);
    assert.equal(report.config.label, "Lokal test");
    assert.equal(report.summary[0].successes, 2);
    assert.ok(report.summary[0].firstReplyMs.average >= 10);
    assert.equal(report.records[0].text, "Hej!");
    assert.match(await readFile(output + ".csv", "utf8"), /first_reply_seconds/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
  }
});
