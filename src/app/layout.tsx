import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KUKANG EV — Attendance & Contribution Tracker",
  description:
    "Sistem manajemen kehadiran QR Code dan pelaporan kontribusi tim KUKANG EV ITERA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KUKANG EV",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#090607",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${jakarta.variable} ${spaceGrotesk.variable} dark`}>
      <body className="font-sans antialiased bg-[#090607] text-[#f5f0f0] selection:bg-[#9E0B0B] selection:text-white">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}