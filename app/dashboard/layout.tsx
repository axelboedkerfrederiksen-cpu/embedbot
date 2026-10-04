import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Dit dashboard | EmbedBot",
  "description": "Administrér din chatbot og dit abonnement.",
  "openGraph": {
    "title": "Dit dashboard | EmbedBot",
    "description": "Administrér din chatbot og dit abonnement."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
