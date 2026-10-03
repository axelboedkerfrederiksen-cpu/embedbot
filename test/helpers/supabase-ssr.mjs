import { state } from './runtime.mjs';
export function createServerClient(){return {auth:{getUser:async()=>({data:{user:state.user},error:null}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:state.aal||{currentLevel:"aal1",nextLevel:"aal1"},error:null})},signOut:async()=>({error:null})}};}
