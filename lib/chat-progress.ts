export type ChatStage = "thinking" | "searching" | "details";

// Opt-in envelope keeps existing plain-text and JSON clients compatible.
export function chatProgressResponse(run: (status: (stage: ChatStage) => void, reference: (id:string,token:string) => void) => Promise<Response>) {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        emit({ type: "status", stage: "thinking" });
        const response = await run(stage => emit({ type: "status", stage }), (id,token)=>emit({type:"reference",id,token}));
        if ((response.headers.get("content-type") || "").includes("application/json")) {
          const data = await response.json();
          emit(response.ok ? { type: "result", data } : { type: "error", message: data.error });
        } else if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              if (text) emit({ type: "text", text });
            }
            const tail = decoder.decode();
            if (tail) emit({ type: "text", text: tail });
          } finally { reader.releaseLock(); }
        }
      } catch {
        emit({ type: "error", message: "Der opstod en fejl. Prøv igen." });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; },
  });
  return new Response(stream, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
