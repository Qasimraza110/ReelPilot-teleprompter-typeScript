import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelPilot | Home",
  description: "ReelPilot is an AI-powered, mobile-first assistant that helps creators record high-quality on-camera videos with real-time pacing, camera guidance, and performance feedback.",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="AI-powered assistant that helps creators record high-quality, on-camera videos with real-time guidance, performance feedback, and trending insights."
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
