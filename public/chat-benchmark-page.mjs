import { DEFAULT_PROMPTS, normalizeConfig, runBenchmark, summarize, statistics, resultsCsv } from "./chat-benchmark-core.mjs";

const element = id => document.getElementById(id);
const seconds = ms => ms === null ? "—" : (ms / 1000).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " s";
let controller = null, report = null;
element("endpoint").value = new URL("/api/chat", location.href).href;
element("prompts").value = DEFAULT_PROMPTS.join("\n");
const params = new URLSearchParams(location.search);
if (params.get("id")) element("business").value = params.get("id");
if (params.get("endpoint")) element("endpoint").value = params.get("endpoint");

function readConfig() {
  return {
    businessId: element("business").value, endpoint: element("endpoint").value,
    label: element("label").value, prompts: element("prompts").value,
    runs: Number(element("runs").value), warmups: Number(element("warmups").value),
    delayMs: Math.round(Number(element("delay").value) * 1000), timeoutMs: Number(element("timeout").value) * 1000,
  };
}
function updateCount() {
  const config = readConfig();
  const count = config.prompts.split("\n").filter(line => line.trim()).length * (config.runs + config.warmups);
  element("request-count").textContent = `${count} kald i alt · ${config.runs} målte gentagelser pr. prompt.`;
}
element("settings").addEventListener("input", updateCount);
element("business").addEventListener("change", () => {
  try {
    const config = normalizeConfig(readConfig());
    element("business").value = config.businessId;
    element("endpoint").value = config.endpoint;
  } catch { /* Validation is shown when the user starts the test. */ }
});
updateCount();

function renderSummary(records, prompts) {
  element("summary").replaceChildren();
  for (const summary of summarize(records, prompts)) {
    const row = document.createElement("tr");
    const cells = [summary.prompt, `${summary.successes} / ${summary.attempted}`,
      seconds(summary.firstReplyMs.average), seconds(summary.firstReplyMs.median),
      seconds(summary.completeMs.average), summary.successes ? `${seconds(summary.completeMs.min)} – ${seconds(summary.completeMs.max)}` : "—"];
    for (const value of cells) { const cell = document.createElement("td"); cell.textContent = value; row.appendChild(cell); }
    element("summary").appendChild(row);
  }
  const measured = records.filter(record => !record.warmup), successes = measured.filter(record => record.ok);
  element("mean-first").textContent = seconds(statistics(successes.map(record => record.firstReplyMs)).average);
  element("mean-complete").textContent = seconds(statistics(successes.map(record => record.completeMs)).average);
  element("success-count").textContent = `${successes.length} / ${measured.length - successes.length}`;
}
function appendRecord(record) {
  const details = document.createElement("details"), summary = document.createElement("summary"), answer = document.createElement("pre");
  summary.textContent = `${record.warmup ? "Opvarmning" : "Runde"} ${record.run} · ${record.prompt} · ${record.ok ? `${seconds(record.firstReplyMs)} første tekst / ${seconds(record.completeMs)} afsluttet` : record.error}`;
  if (!record.ok) summary.className = "error";
  answer.textContent = record.ok ? record.text : `${record.error}${record.text ? "\n\nDelvist svar:\n" + record.text : ""}`;
  details.append(summary, answer);
  element("records").appendChild(details);
}

element("test-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (controller) return;
  let config;
  try { config = normalizeConfig(readConfig()); }
  catch (error) { element("status").textContent = error.message; element("status").className = "error"; return; }
  controller = new AbortController();
  report = null;
  element("settings").disabled = true;
  element("start").disabled = true;
  element("stop").disabled = false;
  element("csv").disabled = element("json").disabled = true;
  element("status").className = "";
  element("status").textContent = "Testen kører. Venter på første svar…";
  element("progress").max = config.requestCount;
  element("progress").value = 0;
  element("records").replaceChildren();
  renderSummary([], config.prompts);
  try {
    report = await runBenchmark(config, {
      signal: controller.signal,
      onResult(record, records) {
        appendRecord(record);
        renderSummary(records, config.prompts);
        element("progress").value = records.length;
        element("status").textContent = `${records.length} af ${config.requestCount} kald afsluttet. ${record.warmup ? "Opvarmning" : "Måling"}: ${record.prompt}`;
      },
    });
    const failures = report.records.filter(record => !record.ok).length;
    element("status").textContent = report.stopReason ? `Stoppet: ${report.stopReason}` : `Færdig: ${report.records.length} kald, ${failures} fejl. Resultaterne kan downloades.`;
    if (report.stopReason || failures) element("status").className = "error";
    element("csv").disabled = element("json").disabled = report.records.length === 0;
  } catch (error) {
    element("status").textContent = error.message;
    element("status").className = "error";
  } finally {
    controller = null;
    element("settings").disabled = false;
    element("start").disabled = false;
    element("stop").disabled = true;
  }
});
element("stop").addEventListener("click", () => { controller?.abort(); element("status").textContent = "Stopper testen…"; });

function download(extension, contents, type) {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `embedbot-svartid-${report.startedAt.replace(/[:.]/g, "-")}.${extension}`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 5000);
}
element("csv").addEventListener("click", () => download("csv", resultsCsv(report), "text/csv;charset=utf-8"));
element("json").addEventListener("click", () => download("json", JSON.stringify(report, null, 2), "application/json"));
