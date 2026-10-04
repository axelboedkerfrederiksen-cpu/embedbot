import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Dine datarettigheder | EmbedBot",
  "description": "Sådan kontakter du EmbedBot om indsigt, rettelse og sletning af personoplysninger.",
  "openGraph": {
    "title": "Dine datarettigheder | EmbedBot",
    "description": "Sådan kontakter du EmbedBot om indsigt, rettelse og sletning af personoplysninger."
  },
  "robots": {
    "index": false,
    "follow": false
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
