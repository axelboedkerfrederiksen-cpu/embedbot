import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Prøv EmbedBot | EmbedBot",
  "description": "Læs om at afprøve EmbedBot på din webshop.",
  "openGraph": {
    "title": "Prøv EmbedBot | EmbedBot",
    "description": "Læs om at afprøve EmbedBot på din webshop."
  },
  "alternates": {
    "canonical": "/pilot"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
