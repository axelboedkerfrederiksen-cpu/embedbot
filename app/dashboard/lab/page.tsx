import { notFound } from "next/navigation";
import WorkspaceClient from "./workspace-client";
export default function WorkspacePage() {
  if(process.env.NODE_ENV!=="development")notFound();
  return <WorkspaceClient/>;
}
