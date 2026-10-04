import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Samtaler | EmbedBot",
  "description": "Se din chatbots samtaler i EmbedBot.",
  "openGraph": {
    "title": "Samtaler | EmbedBot",
    "description": "Se din chatbots samtaler i EmbedBot."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
