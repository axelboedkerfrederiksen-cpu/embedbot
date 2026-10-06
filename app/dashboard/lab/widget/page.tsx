import { notFound } from "next/navigation";
import WidgetPage from "./widget-page";
export default function LocalWidgetPage(){if(process.env.NODE_ENV!=="development")notFound();return <WidgetPage/>;}
