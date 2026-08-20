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

import { ToastProvider } from "@/components/ToastProvider";
import { GlobalModalOverrides } from "@/components/GlobalModalOverrides";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 min-h-screen antialiased select-none font-sans transition-colors duration-200 overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <GlobalModalOverrides>
              {children}
            </GlobalModalOverrides>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
