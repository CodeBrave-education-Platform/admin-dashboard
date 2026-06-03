import "./globals.css";

export const metadata = {
  title: "ASENTRA • Admin Command Center",
  description: "High-precision administrative portal for ASENTRA learning platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased select-none font-sans">
        {children}
      </body>
    </html>
  );
}
