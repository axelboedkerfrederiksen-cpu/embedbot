import { request } from "node:https";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [ip, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",3]] as const) blocked.addSubnet(ip, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
export function publicAddress(ip: string) {
  return isIP(ip) === 4 ? !blocked.check(ip, "ipv4") : isIP(ip) === 6 && globalV6.check(ip, "ipv6") && !blocked.check(ip, "ipv6");
}

export class CommerceHttpError extends Error {
  status: number;
  constructor(status: number) { super("Commerce unavailable"); this.status = status; }
}

// Resolve once and pin that address to the TLS request. Never follow redirects
// carrying credentials. The deadline covers DNS, connection and response body.
export async function shopJson<T>(url: URL, headers: Record<string, string>, body?: unknown): Promise<T> {
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Commerce unavailable");
  return new Promise<T>((resolve, reject) => {
    let active: ReturnType<typeof request> | undefined;
    const deadline = setTimeout(() => { active?.destroy(); reject(new Error("Commerce unavailable")); }, 8000);
    const fail = () => { clearTimeout(deadline); reject(new Error("Commerce unavailable")); };
    void lookup(url.hostname, { all: true }).then(addresses => {
      if (!addresses.length || addresses.some(a => !publicAddress(a.address))) return fail();
      const address = addresses[0];
      const form = body instanceof URLSearchParams;
      const payload = body === undefined ? undefined : form ? body.toString() : JSON.stringify(body);
      active = request(url, {
        method: payload ? "POST" : "GET",
        headers: { ...headers, Accept: "application/json", ...(payload ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json", "Content-Length": String(Buffer.byteLength(payload)) } : {}) },
        lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      }, res => {
        if (res.statusCode !== 200) { clearTimeout(deadline); res.destroy(); reject(new CommerceHttpError(res.statusCode || 0)); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        res.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 1_000_000) { res.destroy(); fail(); } else chunks.push(chunk); });
        res.on("error", fail);
        res.on("end", () => {
          clearTimeout(deadline);
          try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T); } catch { fail(); }
        });
      });
      active.on("error", fail);
      active.end(payload);
    }).catch(fail);
  });
}
