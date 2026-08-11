import "./globals.css";

export const metadata = {
  title: "ASENTRA • Admin Command Center",
  description: "High-precision administrative portal for ASENTRA learning platform",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import { GlobalModalOverrides } from "@/components/GlobalModalOverrides";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} bg-slate-50 text-slate-900 min-h-screen antialiased select-none font-sans`}>
        <ToastProvider>
          <GlobalModalOverrides>
            {children}
          </GlobalModalOverrides>
        </ToastProvider>
      </body>
    </html>
  );
}
