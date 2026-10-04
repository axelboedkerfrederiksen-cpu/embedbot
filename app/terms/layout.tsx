import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Vilkår | EmbedBot",
  "description": "Læs aftalevilkårene for erhvervskunders brug af EmbedBot.",
  "openGraph": {
    "title": "Vilkår | EmbedBot",
    "description": "Læs aftalevilkårene for erhvervskunders brug af EmbedBot."
  },
  "alternates": {
    "canonical": "/terms"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
