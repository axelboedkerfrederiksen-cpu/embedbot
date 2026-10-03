import { seal,unseal,supportKey,validId,validSession } from "../commerce/security.ts";
type Reference={id:string;businessId:string;session:string};
// References are encrypted, authenticated and bound to the widget nonce. They
// cannot be used to attach another visitor's chat by guessing a database ID.
export function chatReference(id:string,businessId:string,session:unknown){
 if(!validId(id)||!validId(businessId)||!validSession(session))return null;
 return seal({id,businessId,session},"chat-reference",supportKey());
}
export function readChatReference(token:unknown,businessId:string,session:unknown){
 if(typeof token!=="string"||token.length>2000||!validSession(session))return null;
 try{const ref=unseal<Reference>(token,"chat-reference",supportKey());return validId(ref.id)&&ref.businessId===businessId&&ref.session===session?ref.id:null;}catch{return null;}
}
