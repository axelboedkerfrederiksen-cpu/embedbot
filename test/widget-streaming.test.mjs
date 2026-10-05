import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../public/widget.js", import.meta.url), "utf8");
const start = source.indexOf("  function createStreamRenderer(");
const end = source.indexOf("  // Build a small Markdown subset", start);
function renderer() {
  const frames = new Map();
  const rendered = [];
  let id = 0, scrolls = 0;
  const context = vm.createContext({
    requestAnimationFrame: work => { frames.set(++id, work); return id; },
    cancelAnimationFrame: frame => frames.delete(frame),
    renderAssistantText: (_target, text) => rendered.push(text),
  });
  vm.runInContext(source.slice(start, end) + "; globalThis.create = createStreamRenderer;", context);
  return {
    stream: context.create({}, () => { scrolls++; }), frames, rendered,
    get scrolls() { return scrolls; },
    paint() { const work = [...frames.values()]; frames.clear(); work.forEach(frame => frame()); },
  };
}

test("a burst of streamed fragments produces one render and one scroll per frame", () => {
  const r = renderer();
  for (let i = 1; i <= 100; i++) r.stream.update("x".repeat(i));
  assert.equal(r.frames.size, 1);
  assert.equal(r.rendered.length, 0);
  r.paint();
  assert.deepEqual(r.rendered, ["x".repeat(100)]);
  assert.equal(r.scrolls, 1);
  r.stream.update("next frame");
  r.paint();
  assert.equal(r.rendered.at(-1), "next frame");
});

test("final flush renders complete Unicode and Markdown even before the scheduled frame", () => {
  const r = renderer();
  r.stream.update("Blød **uld");
  r.stream.flush("Blød **uld**: [Se produkt](https://shop.example/uld)");
  assert.equal(r.frames.size, 0);
  assert.deepEqual(r.rendered, ["Blød **uld**: [Se produkt](https://shop.example/uld)"]);
  r.paint();
  assert.equal(r.rendered.length, 1);
});

test("cancellation prevents a late frame overwriting an error or structured result", () => {
  const r = renderer();
  r.stream.update("old reply");
  r.stream.cancel();
  r.paint();
  assert.deepEqual(r.rendered, []);
});
