import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Leverandører og underdatabehandlere | EmbedBot",
  "description": "Se EmbedBots leverandører, deres roller, behandlingssteder og aftalegrundlag.",
  "openGraph": {
    "title": "Leverandører og underdatabehandlere | EmbedBot",
    "description": "Se EmbedBots leverandører, deres roller, behandlingssteder og aftalegrundlag."
  },
  "alternates": {
    "canonical": "/subprocessors"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
