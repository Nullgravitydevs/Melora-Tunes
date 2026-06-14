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
  metadataBase: new URL('https://meloratunes.com'),
  title: "Melora Tunes - Premium Audio Experience",
  description: "Premium music player with authentic retro cassette deck & iPod experience. Stream, discover, and feel the music.",
  generator: 'Next.js',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Melora Tunes",
  },
  openGraph: {
    title: "Melora Tunes - Premium Audio Experience",
    description: "Premium music player with authentic retro cassette deck & iPod experience. Stream, discover, and feel the music.",
    siteName: "Melora Tunes",
    type: "website",
    images: [
      {
        url: "/app-icon-512x.png",
        width: 512,
        height: 512,
        alt: "Melora Tunes Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Melora Tunes - Premium Audio Experience",
    description: "Premium music player with authentic retro cassette deck & iPod experience.",
    images: ["/app-icon-512x.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/app-icon-192x.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icon-512x.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

import { PwaRegister } from "@/components/pwa-register";
import { PlaybackProvider } from "@/components/providers/playback-context";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { LibraryProvider } from "@/components/providers/library-provider";
import { UIProvider } from "@/components/providers/ui-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Press+Start+2P&family=Share+Tech+Mono&family=Pacifico&family=Playwrite+England:wght@400&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${pressStart2P.variable} font-sans bg-black text-white`}
      >
        <SettingsProvider>
          <UIProvider>
            <LibraryProvider>
              <PlaybackProvider>
                <MotionProvider>
                  <PwaRegister />
                  {children}
                </MotionProvider>
              </PlaybackProvider>
            </LibraryProvider>
          </UIProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
