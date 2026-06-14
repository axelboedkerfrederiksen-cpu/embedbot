import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import "./globals.css";
import UniversalBackButton from "./components/universal-back-button";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EmbedBot",
  description: "EmbedBot - intelligent chatbot til websites",
  icons: {
    icon: logoImage.src,
    shortcut: logoImage.src,
    apple: logoImage.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${poppins.variable} antialiased`}
      >
        <UniversalBackButton />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
