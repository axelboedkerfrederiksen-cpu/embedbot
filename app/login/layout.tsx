import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Log ind | EmbedBot",
  "description": "Log ind på din EmbedBot-konto.",
  "openGraph": {
    "title": "Log ind | EmbedBot",
    "description": "Log ind på din EmbedBot-konto."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
