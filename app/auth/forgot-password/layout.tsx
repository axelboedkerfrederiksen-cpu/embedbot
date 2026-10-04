import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Glemt adgangskode | EmbedBot",
  "description": "Anmod om et link til at nulstille din adgangskode.",
  "openGraph": {
    "title": "Glemt adgangskode | EmbedBot",
    "description": "Anmod om et link til at nulstille din adgangskode."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
