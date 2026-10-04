import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Cookie- og teknologipolitik | EmbedBot",
  "description": "Se hvilke teknologier EmbedBot bruger, og administrér dit valg om analyse og hastighedsmålinger.",
  "openGraph": {
    "title": "Cookie- og teknologipolitik | EmbedBot",
    "description": "Se hvilke teknologier EmbedBot bruger, og administrér dit valg om analyse og hastighedsmålinger."
  },
  "alternates": {
    "canonical": "/cookies"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
