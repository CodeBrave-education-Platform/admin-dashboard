import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ASENTRA • Admin Command Center",
  description: "High-precision administrative portal for ASENTRA learning platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 text-zinc-100 min-h-screen antialiased select-none font-sans`}>
        {children}
      </body>
    </html>
  );
}
