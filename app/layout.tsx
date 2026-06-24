import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Zémato — recomendações de restaurantes entre amigos',
  description: 'Descobre os restaurantes recomendados pelos teus amigos, num mapa.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Zémato — recomendações de restaurantes entre amigos',
    description: 'Descobre os restaurantes recomendados pelos teus amigos, num mapa.',
    type: 'website',
    locale: 'pt_PT',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zémato',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zémato — recomendações de restaurantes entre amigos',
    description: 'Descobre os restaurantes recomendados pelos teus amigos, num mapa.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
