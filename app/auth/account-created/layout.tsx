import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Konto oprettet | EmbedBot",
  "description": "Se næste trin for din nye EmbedBot-konto.",
  "openGraph": {
    "title": "Konto oprettet | EmbedBot",
    "description": "Se næste trin for din nye EmbedBot-konto."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
