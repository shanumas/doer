import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "doer", description: "Autonomous GitHub issue fixer" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-3">
          <a href="/" className="text-lg font-bold tracking-tight hover:text-gray-200">doer</a>
          <span className="text-gray-500 text-sm">autonomous issue fixer</span>
          <a href="/setup" className="ml-auto text-sm text-gray-400 hover:text-gray-200 transition-colors">⚙ Setup</a>
        </header>
        {children}
      </body>
    </html>
  );
}
