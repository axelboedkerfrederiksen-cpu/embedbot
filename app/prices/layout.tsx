import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Priser | EmbedBot",
  "description": "Se EmbedBots abonnementer til webshops, priser ekskl. moms og vilkår for prøveperioden.",
  "openGraph": {
    "title": "Priser | EmbedBot",
    "description": "Se EmbedBots abonnementer til webshops, priser ekskl. moms og vilkår for prøveperioden."
  },
  "alternates": {
    "canonical": "/prices"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
