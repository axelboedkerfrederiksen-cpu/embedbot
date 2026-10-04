import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Ofte stillede spørgsmål | EmbedBot",
  "description": "Svar på spørgsmål om EmbedBot, installation, abonnement og brug af chatbotten.",
  "openGraph": {
    "title": "Ofte stillede spørgsmål | EmbedBot",
    "description": "Svar på spørgsmål om EmbedBot, installation, abonnement og brug af chatbotten."
  },
  "alternates": {
    "canonical": "/faq"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
