import type { SupabaseClient } from "@supabase/supabase-js";
export async function maintenance(db:SupabaseClient,job:"cleanup"|"support",run:()=>Promise<Record<string,number>>) {
 const {data,error}=await db.from("maintenance_runs").insert({job,status:"started"}).select("id").single();
 if(error||!data)throw new Error("job_log_unavailable");
 console.info(JSON.stringify({job,status:"started",run_id:data.id}));
 try {
  const counts=await run();
  const {error:completionError}=await db.from("maintenance_runs").update({status:"completed",completed_at:new Date().toISOString(),counts}).eq("id",data.id);
  if(completionError)throw new Error("job_completion_log_unavailable");
  console.info(JSON.stringify({job,status:"completed",run_id:data.id,counts}));return counts;
 }catch{
  await db.from("maintenance_runs").update({status:"failed",completed_at:new Date().toISOString(),failure_code:"job_failed"}).eq("id",data.id);
  console.error(JSON.stringify({job,status:"failed",run_id:data.id,failure_code:"job_failed"}));throw new Error("job_failed");
 }
}
