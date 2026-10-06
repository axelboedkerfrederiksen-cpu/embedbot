import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { seedWorkspace, type Workspace } from "./model.ts";
// The local lab is a separate data store: no customer database, login bypass,
// production credentials, or outbound mail. Atomic writes plus a process queue
// prevent overlapping actions from dropping each other's changes.
export function workspaceStore(dir: string) {
const file = join(dir, "workspace.json");
let queue: Promise<unknown> = Promise.resolve();
async function readWorkspace(): Promise<Workspace> {
  try { return JSON.parse(await readFile(file,"utf8")); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return seedWorkspace();
  }
}
async function mutateWorkspace(change: (state: Workspace) => void | Promise<void>) {
  const result = queue.then(async () => {
    const state = await readWorkspace();
    await change(state); state.revision++;
    if (JSON.stringify(state).length > 2_000_000) throw new Error("Demoen er fuld. Fjern en kilde, før du tilføjer mere indhold.");
    await mkdir(dir,{recursive:true});
    const temp=join(dir,`${randomUUID()}.tmp`);
    await writeFile(temp,JSON.stringify(state,null,2),{mode:0o600}); await rename(temp,file);
    return state;
  });
  queue=result.catch(()=>undefined); return result;
}
return { readWorkspace, mutateWorkspace };
}
const store = workspaceStore(join(process.cwd(), ".local-workspace"));
export const { readWorkspace, mutateWorkspace } = store;
export function localRequestAllowed(req: Request, mutation = false, environment = process.env.NODE_ENV) {
  if (environment !== "development") return false;
  const url = new URL(req.url);
  const loopback = (host: string) => ["localhost","127.0.0.1","[::1]"].includes(host);
  if (!loopback(url.hostname)) return false;
  const host = req.headers.get("host");
  try { if (!host || !loopback(new URL(`http://${host}`).hostname)) return false; } catch { return false; }
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  if (mutation && req.headers.get("origin") !== new URL(`${url.protocol}//${host}`).origin) return false;
  return true;
}
