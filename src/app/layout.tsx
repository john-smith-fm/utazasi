import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AppAccessGate } from "@/components/AppAccessGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
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
  const initialAuthenticated = hasValidAccessSession(cookies().get(ACCESS_COOKIE_NAME)?.value);

  return (
    <html lang="hu">
      <body className="bg-quartz font-sans text-deep-sea pb-[calc(64px+env(safe-area-inset-bottom))]">
        <AppAccessGate initialAuthenticated={initialAuthenticated}>{children}</AppAccessGate>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
