import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { TabBar } from "@/components/TabBar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Utazási — Villasimius Guide",
  description: "Személyre szabott digitális útikalauz a villasimiusi családi nyaraláshoz.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Utazási",
  },
  icons: {
    apple: "/icons/utazasi-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#18323B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="bg-quartz font-sans text-deep-sea pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
        <TabBar />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
