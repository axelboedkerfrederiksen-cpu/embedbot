import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
// Minimal Supabase transport fake: application queries execute against isolated
// PostgreSQL, while external APIs/mail are mocks. No production connection.
export async function testDatabase() {
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.businesses (id uuid primary key, user_id uuid, activated boolean default true, is_deleted boolean default false, name text, website_url text, support_email text);
    create table public.conversations (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id) on delete cascade, messages jsonb, created_at timestamptz default now(), is_deleted boolean default false, deleted_at timestamptz);`);
  await pg.exec(await readFile(new URL("../../sql/add_embedbot_commerce.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../sql/create_chat_rate_limit.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../sql/add_website_sources.sql", import.meta.url), "utf8"));
  await pg.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function public.test_user_fixture() returns trigger language plpgsql as $$ begin if new.user_id is not null then insert into auth.users(id) values(new.user_id) on conflict do nothing;end if;return new;end $$;
    create trigger test_user_fixture before insert on public.businesses for each row execute function public.test_user_fixture();
    alter table public.businesses add column retention_days integer default 90, add column created_at timestamptz default now(),add column activated_at timestamptz,add column current_period_end timestamptz,add column stripe_subscription_id text,add column subscription_status text,add column payment_status text,add column plan text,add column subscription_updated_at timestamptz;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text,display_name text,avatar_url text,created_at timestamptz default now());
    create table public.documents(id uuid primary key default gen_random_uuid(),business_id uuid references public.businesses(id) on delete cascade,content text);
    create table public.support_messages(id uuid primary key default gen_random_uuid(),type text,name text,email text,business_name text,message text,status text,created_at timestamptz default now());
    create table public.customer_messages(id uuid primary key default gen_random_uuid(),business_id uuid references public.businesses(id) on delete cascade,sender text,title text,body text,action_url text,action_label text,read_at timestamptz,created_at timestamptz default now());`);
  const {EXPORT_FIELDS}=await import("../../lib/compliance/export.ts");
  for(const name of EXPORT_FIELDS.businesses.split(",")) {
    if(!/^[a-z_][a-z0-9_]*$/.test(name))throw new Error("Invalid fixture column");
    await pg.exec(`alter table public.businesses add column if not exists ${name} text`);
  }
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261001084445_add_conversation_retention_cleanup.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261002183142_compliance_phase_1_2.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261003072702_agreed_trial_end.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261003093920_agreed_retention_defaults.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261003172509_supplier_review_and_contract_identity.sql", import.meta.url), "utf8"));
  await pg.exec(await readFile(new URL("../../supabase/migrations/20261003200520_remove_public_contact_address.sql", import.meta.url), "utf8"));
  const column = (name: string) => { if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("Invalid test column"); return name; };
  class Query {
    table: string; operation = "select"; values: Record<string, unknown> = {}; filters: [string,string,unknown][] = []; selected = "*"; countOnly = false; returning = false; conflict = ""; ignore = false; sort = ""; max: number | null = null; countMutation = false;
    constructor(table: string) { this.table = column(table); }
    insert(value: Record<string,unknown>) { this.operation = "insert"; this.values = Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined)); return this; }
    upsert(value: Record<string,unknown>, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) { this.insert(value); this.conflict = options.onConflict || "business_id"; this.ignore = options.ignoreDuplicates || false; return this; }
    delete(options: {count?:string} = {}) { this.operation = "delete"; this.countMutation=options.count==="exact";return this; }
    update(value: Record<string,unknown>) { this.operation = "update"; this.values = Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined)); return this; }
    select(value = "*", options: {count?: string; head?: boolean} = {}) { this.countOnly = options.count === "exact" && options.head === true; this.selected = value; this.returning = this.operation !== "select"; return this; }
    eq(name: string, value: unknown) { this.filters.push([name,"=",value]); return this; }
    ilike(name:string,value:string){this.filters.push([name,"ilike",value]);return this;}
    gt(name:string,value:unknown) {this.filters.push([name,">",value]);return this;}
    lt(name:string,value:unknown) {this.filters.push([name,"<",value]);return this;}
    gte(name:string,value:unknown) {this.filters.push([name,">=",value]);return this;}
    neq(name: string, value: unknown) { this.filters.push([name,"<>",value]); return this; }
    in(name: string, value: unknown[]) { this.filters.push([name,"in",value]); return this; }
    or(value: string) { this.filters.push(["refresh_locked_until","refresh",value.split(".lt.")[1]]); return this; }
    async run(single = false) {
      try {
        const params: unknown[] = [];
        const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
        const fields = this.selected === "*" ? "*" : this.selected.split(",").map(name => column(name.trim())).join(",");
        let sql = "";
        if (this.operation === "select") sql = `select ${this.countOnly ? "count(*) as total" : fields} from public.${this.table}`;
        if (this.operation === "insert") {
          const keys = Object.keys(this.values);
          sql = `insert into public.${this.table} (${keys.map(column).join(",")}) values (${keys.map(k => add(["context","messages","counts","document"].includes(k) ? JSON.stringify(this.values[k]) : this.values[k])).join(",")})`;
          if (this.conflict) sql += ` on conflict (${this.conflict.split(",").map(column).join(",")}) do ${this.ignore ? "nothing" : "update set " + Object.keys(this.values).filter(k => !this.conflict.split(",").includes(k)).map(k => `${column(k)}=excluded.${column(k)}`).join(",")}`;
        }
        if (this.operation === "delete") sql = `delete from public.${this.table}`;
        if (this.operation === "update") sql = `update public.${this.table} set ${Object.entries(this.values).map(([k,v]) => `${column(k)}=${add(["context","messages","counts","document"].includes(k) ? JSON.stringify(v):v)}`).join(",")}`;
        if (this.filters.length) sql += " where " + this.filters.map(([name,op,value]) => op === "in" ? `${column(name)}::text = any(${add(value)}::text[])` : op === "refresh" ? `(${column(name)} is null or ${column(name)} < ${add(value)}::timestamptz)` : `${column(name)} ${op} ${add(value)}`).join(" and ");
        if (this.operation === "select" && !this.countOnly) {if(this.sort)sql+=` order by ${this.sort}`;if(this.max!==null)sql+=` limit ${this.max}`;}
        if (this.countMutation)sql+=" returning id";
        if (this.returning) sql += ` returning ${fields}`;
        const result = await pg.query<Record<string, unknown>>(sql, params);
        return { data: this.countOnly ? null : single ? result.rows[0] || null : result.rows, count: this.countOnly ? Number(result.rows[0]?.total) : this.countMutation ? result.rows.length : null, error: null };
      } catch (error) { return { data: null, error }; }
    }
    order(name:string, options:{ascending?:boolean}={}) {this.sort=`${column(name)} ${options.ascending===false?"desc":"asc"}`;return this;}
    returns() { return this; }
    limit(value:number) {this.max=value;return this;}
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
        const signatures:Record<string,string[]>={
          update_business_privacy:["p_business_id","p_actor","p_url","p_ticket_days","p_chat_days"],
          accept_legal_document:["p_business_id","p_actor","p_slug","p_version","p_sha256"],
          visitor_records:["p_business_id","p_actor","p_kind","p_value","p_after_kind","p_after_id","p_limit"],
          delete_visitor_data:["p_business_id","p_actor","p_kind","p_value"],compliance_cleanup:[],
          start_embedbot_trial:["p_business_id","p_actor","p_terms_version"],
          delete_owner_conversations:["p_business_id","p_actor","p_id"],delete_embedbot_account_data:["target_user_id","target_email"],
        };
        const keys=signatures[name];if(keys){const result=await pg.query<{value:unknown}>(`select ${name==="visitor_records"||name==="delete_embedbot_account_data"?"*":`public.${name}(${keys.map((_,i)=>`$${i+1}`).join(",")}) as value`}${name==="visitor_records"||name==="delete_embedbot_account_data"?` from public.${name}(${keys.map((_,i)=>`$${i+1}`).join(",")})`:""}`,keys.map(k=>args?.[k]));return {data:name==="visitor_records"||name==="delete_embedbot_account_data"?result.rows:result.rows[0].value,error:null};}
        throw new Error("Unexpected RPC");
      } catch (error) { return { data: null, error }; }
    },
  } as unknown as SupabaseClient;
  return { pg, client };
}
