import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Vælg abonnement | EmbedBot",
  "description": "Vælg abonnement og gennemgå betalingsvilkår for EmbedBot.",
  "openGraph": {
    "title": "Vælg abonnement | EmbedBot",
    "description": "Vælg abonnement og gennemgå betalingsvilkår for EmbedBot."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
