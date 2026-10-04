import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Databehandleraftale | EmbedBot",
  "description": "Læs EmbedBots databehandleraftale og den aktuelle status for kundeaccept.",
  "openGraph": {
    "title": "Databehandleraftale | EmbedBot",
    "description": "Læs EmbedBots databehandleraftale og den aktuelle status for kundeaccept."
  },
  "alternates": {
    "canonical": "/dpa"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
