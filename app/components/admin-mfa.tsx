"use client";
import Image from "next/image";
import { useMemo,useState } from "react";
import { createClient } from "@/lib/supabase";
export default function AdminMfa({onVerified}:{onVerified:()=>Promise<void>}){
 const auth=useMemo(()=>createClient(),[]);const [factor,setFactor]=useState("");const [qr,setQr]=useState("");const [code,setCode]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 async function prepare(){setBusy(true);setNotice("");try{
  const {data,error}=await auth.auth.mfa.listFactors();if(error)throw error;
  const existing=data.totp.find(f=>f.status==="verified");
  if(existing){setFactor(existing.id);return;}
  const pending=data.all.find(f=>f.factor_type==="totp"&&f.status==="unverified");if(pending){const {error:removeError}=await auth.auth.mfa.unenroll({factorId:pending.id});if(removeError)throw removeError;}
  const {data:enrolled,error:enrollError}=await auth.auth.mfa.enroll({factorType:"totp",friendlyName:"EmbedBot admin"});if(enrollError)throw enrollError;
  setFactor(enrolled.id);setQr(enrolled.totp.qr_code);
 }catch{setNotice("Totrinsbekræftelsen kunne ikke startes.");}finally{setBusy(false);}}
 async function verify(){setBusy(true);setNotice("");try{
  const {error}=await auth.auth.mfa.challengeAndVerify({factorId:factor,code});if(error)throw error;setCode("");setQr("");setNotice("Totrinsbekræftelsen er godkendt. Kontrollerer admin-adgangen …");await onVerified();
 }catch(error){setNotice(error instanceof Error && error.message === "Admin-adgangen blev afvist. Se beskeden nedenfor." ? error.message : "Koden kunne ikke bekræftes. Brug en ny kode fra din authenticator.");}finally{setBusy(false);}}
 return <div className="my-4 space-y-3 rounded-xl border p-4"><p>Totrinsbekræftelse til din konto</p>{!factor?<button type="button" disabled={busy} onClick={()=>void prepare()}>Brug eller opsæt authenticator</button>:<>{qr?<div><Image unoptimized src={qr} width={180} height={180} alt="Scan QR-koden med din authenticator-app"/></div>:null}<label className="block">Authenticator-kode<input className="block rounded border p-2" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><button type="button" disabled={busy||!/^[0-9]{6}$/.test(code)} onClick={()=>void verify()}>Bekræft kode</button></>}{notice?<p role="alert">{notice}</p>:null}</div>;
}
