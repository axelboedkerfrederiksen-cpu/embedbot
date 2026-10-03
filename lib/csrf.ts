import type { NextRequest } from "next/server";
// Browser mutations require their actual same-origin Origin. A client-chosen
// header is not an authentication mechanism or a validated CSRF token.
export async function checkCsrfSafety(req:NextRequest):Promise<{safe:boolean;error?:string}>{
 if(["GET","HEAD","OPTIONS"].includes(req.method))return {safe:true};
 const safe=req.headers.get("origin")===req.nextUrl.origin;
 return safe?{safe:true}:{safe:false,error:"Ugyldig anmodningsoprindelse."};
}
