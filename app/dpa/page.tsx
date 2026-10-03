import Link from "next/link";
import { Fragment } from "react";
import publication from "@/lib/compliance/dpa-publication.json";

export const metadata = {
 title: "Databehandleraftale — EmbedBot",
 description: "Databehandleraftale for EmbedBot med behandlingsbeskrivelse, sikkerhed, underdatabehandlere og opbevaring.",
};

function InlineText({text}:{text:string}){
 return text.split(/(\*\*[^*]+\*\*)/g).map((part,index)=><Fragment key={index}>{part.startsWith("**")&&part.endsWith("**")?<strong>{part.slice(2,-2)}</strong>:part}</Fragment>);
}

export default function Page(){
 return <main id="main-content" className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8"><article className="privacy-policy mx-auto max-w-4xl">
  <Link href="/">← Tilbage til EmbedBot</Link>
  <h1>{publication.title}</h1><p>Version {publication.version} · 3. oktober 2026</p>
  <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-5" role="note">{publication.notice}</div>
  {publication.blocks.map((block,index)=>{
   if(block.type==="heading")return <h2 key={index}>{block.text}</h2>;
   if(block.type==="list")return <ul key={index}>{block.items?.map((item,itemIndex)=><li key={itemIndex}><InlineText text={item}/></li>)}</ul>;
   if(block.type==="table"){
    const [header,...rows]=block.rows??[];
    return <div key={index} className="my-6 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{header?.map((cell,cellIndex)=><th scope="col" className="border border-gray-200 bg-gray-50 p-3 align-top" key={cellIndex}><InlineText text={cell}/></th>)}</tr></thead><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td className="border border-gray-200 p-3 align-top" key={cellIndex}><InlineText text={cell}/></td>)}</tr>)}</tbody></table></div>;
   }
   return <p key={index} className="whitespace-pre-line"><InlineText text={block.text??""}/></p>;
  })}
  <nav className="mt-10 flex flex-wrap gap-4"><Link href="/privacy">Privatliv</Link><Link href="/terms">Vilkår</Link><Link href="/subprocessors">Leverandører</Link><Link href="/data-requests">Dataanmodninger</Link></nav>
 </article></main>;
}
