import type { Metadata, Viewport } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "TFI Stereo - Premium Audio Experience",
  description: "High-fidelity retro cassette player and music mixer.",
  generator: 'Next.js',
  manifest: '/manifest.json',
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "TFI Stereo",
  },
  icons: {
    icon: [
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { PwaRegister } from "@/components/pwa-register";
import { RotatePrompt } from "@/components/ui/rotate-prompt";
import { PlaybackProvider } from "@/components/providers/playback-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${pressStart2P.variable} font-sans bg-black text-white`}
      >
        <PlaybackProvider>
          <PwaRegister />
          {children}
        </PlaybackProvider>
      </body>
    </html>
  );
}
