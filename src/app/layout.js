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
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900 min-h-screen antialiased select-none font-sans`}>
        {children}
      </body>
    </html>
  );
}
