import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Administration | EmbedBot",
  "description": "Administration af EmbedBot.",
  "openGraph": {
    "title": "Administration | EmbedBot",
    "description": "Administration af EmbedBot."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
