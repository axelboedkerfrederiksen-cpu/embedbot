import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Privatlivspolitik | EmbedBot",
  "description": "Læs om EmbedBots behandling af personoplysninger, leverandører, opbevaring og dine rettigheder.",
  "openGraph": {
    "title": "Privatlivspolitik | EmbedBot",
    "description": "Læs om EmbedBots behandling af personoplysninger, leverandører, opbevaring og dine rettigheder."
  },
  "alternates": {
    "canonical": "/privacy"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
