import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Inter, Lora, Poppins } from "next/font/google";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import "./globals.css";
import UniversalBackButton from "./components/universal-back-button";
import CookieConsent from "./components/cookie-consent";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "700"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const dmSerifDisplay = DM_Serif_Display({ variable: "--font-dm-serif-display", subsets: ["latin"], weight: ["400"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.embedbot.dk"),
  title: "EmbedBot | AI-kundeservice til din webshop",
  description: "AI-kundeservice til webshops på tværs af platforme. Hjælp kunderne med svar om produkter, levering og retur. Se demo, priser og prøvevilkår.",
  openGraph: { type: "website", locale: "da_DK", siteName: "EmbedBot" },
  twitter: { card: "summary_large_image" },
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
    <html lang="da">
      <body
        suppressHydrationWarning
        className={`${poppins.variable} ${inter.variable} ${dmSans.variable} ${dmSerifDisplay.variable} ${lora.variable} antialiased`}
      >
        <a className="skip-link" href="#main-content">
          Spring til hovedindhold
        </a>
        <UniversalBackButton />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
