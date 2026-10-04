import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Opsæt din chatbot | EmbedBot",
  "description": "Opret og tilpas EmbedBot til din virksomhed.",
  "openGraph": {
    "title": "Opsæt din chatbot | EmbedBot",
    "description": "Opret og tilpas EmbedBot til din virksomhed."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
