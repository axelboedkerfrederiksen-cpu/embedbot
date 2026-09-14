import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewClient from "./preview-client";

export const metadata: Metadata = {
  title: "Chatbot demo | EmbedBot",
  description: "Linkbaseret gennemgang af en EmbedBot-chatbot.",
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  return <PreviewClient businessId={id} />;
}
