import type { Metadata, Viewport } from "next";
import { AppAccessGate } from "@/components/AppAccessGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

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
    <html lang="hu">
      <body className="bg-quartz font-sans text-deep-sea pb-[calc(64px+env(safe-area-inset-bottom))]">
        <AppAccessGate>{children}</AppAccessGate>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
