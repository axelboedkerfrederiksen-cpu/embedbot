import { notFound } from "next/navigation";
import { validId } from "@/lib/commerce/security";
import WorkspaceClient from "./workspace-client";
export const metadata={title:"Dit arbejdsområde | EmbedBot",robots:{index:false,follow:false}};
export default async function WorkspacePage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!validId(id))notFound();return <WorkspaceClient businessId={id}/>;}
