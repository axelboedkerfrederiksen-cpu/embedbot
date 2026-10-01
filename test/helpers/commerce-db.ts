import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
// Minimal Supabase transport fake: application queries execute against isolated
// PostgreSQL, while external APIs/mail are mocks. No production connection.
export async function testDatabase() {
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.businesses (id uuid primary key, user_id uuid, activated boolean default true, is_deleted boolean default false, name text, website_url text, support_email text);
    create table public.conversations (id uuid primary key default gen_random_uuid(), business_id uuid, messages jsonb, created_at timestamptz default now());`);
  await pg.exec(await readFile(new URL("../../sql/add_embedbot_commerce.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../sql/create_chat_rate_limit.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../sql/add_website_sources.sql", import.meta.url), "utf8"));
  const column = (name: string) => { if (!/^[a-z_]+$/.test(name)) throw new Error("Invalid test column"); return name; };
  class Query {
    table: string; operation = "select"; values: Record<string, unknown> = {}; filters: [string,string,unknown][] = []; selected = "*"; returning = false; conflict = ""; ignore = false;
    constructor(table: string) { this.table = column(table); }
    insert(value: Record<string,unknown>) { this.operation = "insert"; this.values = value; return this; }
    upsert(value: Record<string,unknown>, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) { this.insert(value); this.conflict = options.onConflict || "business_id"; this.ignore = options.ignoreDuplicates || false; return this; }
    delete() { this.operation = "delete"; return this; }
    update(value: Record<string,unknown>) { this.operation = "update"; this.values = value; return this; }
    select(value = "*") { this.selected = value; this.returning = this.operation !== "select"; return this; }
    eq(name: string, value: unknown) { this.filters.push([name,"=",value]); return this; }
    neq(name: string, value: unknown) { this.filters.push([name,"<>",value]); return this; }
    in(name: string, value: unknown[]) { this.filters.push([name,"in",value]); return this; }
    or(value: string) { this.filters.push(["refresh_locked_until","refresh",value.split(".lt.")[1]]); return this; }
    async run(single = false) {
      try {
        const params: unknown[] = [];
        const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
        const fields = this.selected === "*" ? "*" : this.selected.split(",").map(name => column(name.trim())).join(",");
        let sql = "";
        if (this.operation === "select") sql = `select ${fields} from public.${this.table}`;
        if (this.operation === "insert") {
          const keys = Object.keys(this.values);
          sql = `insert into public.${this.table} (${keys.map(column).join(",")}) values (${keys.map(k => add(k === "context" ? JSON.stringify(this.values[k]) : this.values[k])).join(",")})`;
          if (this.conflict) sql += ` on conflict (${this.conflict.split(",").map(column).join(",")}) do ${this.ignore ? "nothing" : "update set " + Object.keys(this.values).filter(k => !this.conflict.split(",").includes(k)).map(k => `${column(k)}=excluded.${column(k)}`).join(",")}`;
        }
        if (this.operation === "delete") sql = `delete from public.${this.table}`;
        if (this.operation === "update") sql = `update public.${this.table} set ${Object.entries(this.values).map(([k,v]) => `${column(k)}=${add(v)}`).join(",")}`;
        if (this.filters.length) sql += " where " + this.filters.map(([name,op,value]) => op === "in" ? `${column(name)} = any(${add(value)}::text[])` : op === "refresh" ? `(${column(name)} is null or ${column(name)} < ${add(value)}::timestamptz)` : `${column(name)} ${op} ${add(value)}`).join(" and ");
        if (this.returning) sql += ` returning ${fields}`;
        const result = await pg.query(sql, params);
        return { data: single ? result.rows[0] || null : result.rows, error: null };
      } catch (error) { return { data: null, error }; }
    }
    order() { return this; }
    returns() { return this; }
    limit() { return this; }
    maybeSingle() { return this.run(true); }
    single() { return this.run(true); }
    then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) { return this.run().then(resolve, reject); }
  }
  const client = {
    from: (table: string) => new Query(table),
    rpc: async (name: string, args: Record<string,unknown>) => {
      try {
        if (name === "enforce_chat_rate_limit") {
          const result = await pg.query<{ value: boolean }>("select public.enforce_chat_rate_limit($1,$2,$3) as value", [args.p_ip_hash,args.p_limit,args.p_window_seconds]);
          return { data: result.rows[0].value, error: null };
        }
        if (name === "consume_commerce_connection") {
          const result = await pg.query("select * from public.consume_commerce_connection($1)", [args.p_token_hash]);
          return { data: result.rows, error: null };
        }
        if (name === "consume_commerce_challenge") {
          const values = [args.p_id,args.p_business_id,args.p_session_hash,args.p_code_hash,args.p_revision];
          const result = await pg.query<{ value: string | null }>("select public.consume_commerce_challenge($1,$2,$3,$4,$5) as value", values);
          return { data: result.rows[0].value, error: null };
        }
        if (name === "claim_commerce_notification") {
          const result = await pg.query("select * from public.claim_commerce_notification($1,$2)", [args.p_id,args.p_business_id]);
          return { data: result.rows, error: null };
        }
        throw new Error("Unexpected RPC");
      } catch (error) { return { data: null, error }; }
    },
  } as unknown as SupabaseClient;
  return { pg, client };
}
