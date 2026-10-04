import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Ny adgangskode | EmbedBot",
  "description": "Vælg en ny adgangskode til din EmbedBot-konto.",
  "openGraph": {
    "title": "Ny adgangskode | EmbedBot",
    "description": "Vælg en ny adgangskode til din EmbedBot-konto."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
