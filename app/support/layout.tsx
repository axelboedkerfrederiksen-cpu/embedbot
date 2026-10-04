import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Kontakt og support | EmbedBot",
  "description": "Kontakt EmbedBot med spørgsmål, supporthenvendelser eller klager.",
  "openGraph": {
    "title": "Kontakt og support | EmbedBot",
    "description": "Kontakt EmbedBot med spørgsmål, supporthenvendelser eller klager."
  },
  "alternates": {
    "canonical": "/support"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
