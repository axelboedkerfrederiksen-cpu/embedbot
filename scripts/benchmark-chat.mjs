import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { DEFAULT_PROMPTS, runBenchmark, resultsCsv } from "../public/chat-benchmark-core.mjs";

const help = `EmbedBot svartidstest

Brug:
  npm run benchmark:chat -- --business-id CHATBOT_ID
  npm run benchmark:chat -- --widget-url 'https://www.embedbot.dk/widget.js?id=CHATBOT_ID'

Indstillinger:
  --endpoint URL       App-adresse eller fuld /api/chat-adresse (standard: https://www.embedbot.dk)
  --prompts FIL        Prompts som JSON-array eller én prompt pr. linje
  --runs ANTAL         Målte gentagelser pr. prompt (standard: 5)
  --warmups ANTAL      Opvarmningsrunder, uden for gennemsnit (standard: 0)
  --delay-ms MS        Pause mellem kald (standard: 500)
  --timeout-ms MS      Timeout pr. kald (standard: 60000)
  --label NAVN         Navn på målingen
  --out STI            Filnavn uden filtype til JSON og CSV (standard: .benchmarks/tidsstempel)
  --help               Vis hjælp

Kald tæller i chatbotens normale forbrug. Maksimum 50 kald pr. test.
Testen stopper ved serverens forbrugsgrænse eller en forkert konfiguration.
`;

function argumentsFor(argv) {
  const names = new Set(["business-id", "widget-url", "endpoint", "prompts", "runs", "warmups", "delay-ms", "timeout-ms", "label", "out"]);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help") { args.help = true; continue; }
    const name = argv[i].replace(/^--/, "");
    if (!argv[i].startsWith("--") || !names.has(name)) throw new Error(`Ukendt indstilling: ${argv[i]}`);
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Mangler værdi for --${name}`);
    args[name] = argv[++i];
  }
  return args;
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (args.help) { console.log(help); return; }
  let prompts = DEFAULT_PROMPTS;
  if (args.prompts) {
    const raw = await readFile(resolve(args.prompts), "utf8");
    prompts = args.prompts.endsWith(".json") ? JSON.parse(raw) : raw;
    if (args.prompts.endsWith(".json") && !Array.isArray(prompts)) throw new Error("Prompt-filen skal være et JSON-array med tekster.");
  }
  const controller = new AbortController();
  const stop = () => { console.log("\nStopper testen…"); controller.abort(); };
  process.once("SIGINT", stop);
  let report;
  try {
    report = await runBenchmark({
      businessId: args["widget-url"] || args["business-id"],
      endpoint: args.endpoint || "https://www.embedbot.dk",
      prompts, runs: args.runs, warmups: args.warmups,
      delayMs: args["delay-ms"], timeoutMs: args["timeout-ms"], label: args.label,
    }, { signal: controller.signal, onResult(record, records) {
      const seconds = ms => (ms / 1000).toFixed(2) + " s";
      console.log(`[${records.length}] ${record.warmup ? "Opvarmning" : "Runde"} ${record.run} · ${record.prompt} · ${record.ok ? `${seconds(record.firstReplyMs)} første tekst / ${seconds(record.completeMs)} afsluttet` : record.error}`);
    } });
  } finally { process.removeListener("SIGINT", stop); }
  const seconds = value => value === null ? "—" : (value / 1000).toFixed(3);
  console.table(report.summary.map(row => ({
    Prompt: row.prompt, Svar: `${row.successes}/${row.attempted}`,
    "Gns. første (s)": seconds(row.firstReplyMs.average),
    "Median første (s)": seconds(row.firstReplyMs.median),
    "Gns. afsluttet (s)": seconds(row.completeMs.average),
    "Median afsluttet (s)": seconds(row.completeMs.median),
  })));
  const output = resolve(args.out || `.benchmarks/${report.startedAt.replace(/[:.]/g, "-")}`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output + ".json", JSON.stringify(report, null, 2) + "\n");
  await writeFile(output + ".csv", resultsCsv(report));
  console.log(`\nResultater: ${output}.json og ${output}.csv`);
  if (report.stopReason) console.log(`Stoppet: ${report.stopReason}`);
  if (controller.signal.aborted) process.exitCode = 130;
  else if (report.records.some(record => !record.ok)) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
