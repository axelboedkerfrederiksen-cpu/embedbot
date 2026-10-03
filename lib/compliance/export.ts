import type { SupabaseClient, User } from "@supabase/supabase-js";
export const EXPORT_FIELDS = {
 profiles: "id,username,display_name,avatar_url,created_at",
 businesses: "id,user_id,name,website_url,industry,description,support_email,phone,address,city,hours_weekday,hours_saturday,hours_sunday,response_time,fallback_action,complaint_action,products_services,delivery_time,return_policy,payment_methods,welcome_message,tone,language,faq,cvr,social_media,current_offers,warranty,size_guide,activated,primary_color,secondary_color,fab_color,chat_icon_color,font_choice,logo_url,custom_instructions,created_at,retention_days,deleted_at,is_deleted,subscription_status,payment_status,stripe_customer_id,stripe_subscription_id,current_period_end,canceled_at,activated_at,subscription_updated_at,chat_outline_enabled,chat_outline_color,chat_outline_width,chat_outline_opacity,widget_opacity,plan,ai_answers_used,ai_answer_limit_override,ai_usage_period_start",
 conversations: "id,business_id,created_at,messages,deleted_at,is_deleted",
 documents: "id,business_id,content",
 customer_messages: "id,business_id,sender,title,body,action_url,action_label,read_at,created_at",
 support_messages: "id,type,name,email,business_name,message,status,created_at",
 commerce_tickets: "id,business_id,case_number,contact_email,description,order_number,customer_verified,context,conversation_ids,status,notification_email,notification_status,notification_attempts,notification_first_attempt_at,notification_updated_at,created_at,updated_at",
 website_sources: "business_id,source_kind,source_name,content_text,character_count,truncated,imported_at",
 commerce_integrations: "business_id,platform,shop_url,status,revision,tested_at,updated_at",
 commerce_settings: "business_id,notification_email,updated_at",
 business_privacy_settings: "business_id,customer_privacy_url,ticket_retention_days,updated_at",
 legal_acceptances: "id,business_id,slug,version,accepted_at,accepted_by",
} as const;
type Row = Record<string, unknown>;
// Stable primary-key keyset pagination avoids the PostgREST default 1000-row cap.
type PageQuery = PromiseLike<{data:Row[]|null;error:unknown}> & {
 eq:(key:string,value:unknown)=>PageQuery; ilike:(key:string,value:string)=>PageQuery; in:(key:string,value:unknown[])=>PageQuery; gt:(key:string,value:unknown)=>PageQuery;
 order:(key:string,options:{ascending:boolean})=>PageQuery; limit:(count:number)=>PageQuery;
};
export async function allRows(db: SupabaseClient, table: string, fields: string, key: string, filter: (query:PageQuery)=>PageQuery) {
  const rows: Row[] = []; let cursor: string | undefined;
  for (;;) {
    let query = db.from(table).select(fields).order(key,{ascending:true}).limit(500) as unknown as PageQuery;
    query = filter(query);
    if (cursor) query = query.gt(key,cursor);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) throw new Error("export_query_failed");
    rows.push(...data);
    if (data.length < 500) break;
    const next = String(data[data.length-1][key]);
    if (next === cursor || next === "undefined") throw new Error("export_pagination_failed");
    cursor = next;
  }
  return rows;
}
export async function exportAccount(db: SupabaseClient, user: User) {
  const businesses = await allRows(db,"businesses",EXPORT_FIELDS.businesses,"id",q=>q.eq("user_id",user.id));
  const ids = businesses.map(b=>String(b.id));
  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id:user.id,email:user.email ?? null,phone:user.phone ?? null,created_at:user.created_at,updated_at:user.updated_at,last_sign_in_at:user.last_sign_in_at ?? null },
    profiles: await allRows(db,"profiles",EXPORT_FIELDS.profiles,"id",q=>q.eq("id",user.id)), businesses,
    support_messages: user.email ? await allRows(db,"support_messages",EXPORT_FIELDS.support_messages,"id",q=>q.ilike("email",user.email!.replace(/[\\%_]/g, "\\$&"))) : [],
  };
  for (const table of Object.keys(EXPORT_FIELDS) as (keyof typeof EXPORT_FIELDS)[]) {
    if (["profiles","businesses","support_messages"].includes(table)) continue;
    const key = ["website_sources","commerce_integrations","commerce_settings","business_privacy_settings"].includes(table) ? "business_id" : "id";
    const rows: Row[] = [];
    for (let offset=0;offset<ids.length;offset+=100) rows.push(...await allRows(db,table,EXPORT_FIELDS[table],key,q=>q.in("business_id",ids.slice(offset,offset+100))));
    result[table]=rows;
  }
  const acceptances = result.legal_acceptances as Row[];
  const archives=[];
  for (const key of new Set(acceptances.map(a=>`${a.slug}:${a.version}`))) {
    const [slug,version] = key.split(":");
    const {data,error}=await db.from("legal_document_versions").select("slug,version,sha256,document").eq("slug",slug).eq("version",version).single();
    if(error) throw new Error("export_archive_failed"); archives.push(data);
  }
  result.accepted_documents=archives;
  result.excluded="Passwords, auth metadata, API keys, encrypted credentials, tokens, challenges, connection proofs, rate-limit hashes and separate internal audit logs. This export is paginated but is not a transaction snapshot; contact support if concurrent changes need reconciliation.";
  return result;
}
