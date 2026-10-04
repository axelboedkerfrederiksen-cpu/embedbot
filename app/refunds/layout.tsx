import type { Metadata } from "next";

export const metadata: Metadata = {
  "title": "Betaling, opsigelse og refundering | EmbedBot",
  "description": "Læs om betaling, prøveperiode, opsigelse og refundering for EmbedBots erhvervskunder.",
  "openGraph": {
    "title": "Betaling, opsigelse og refundering | EmbedBot",
    "description": "Læs om betaling, prøveperiode, opsigelse og refundering for EmbedBots erhvervskunder."
  },
  "alternates": {
    "canonical": "/refunds"
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
