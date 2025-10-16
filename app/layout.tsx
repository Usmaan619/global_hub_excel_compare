import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Excel Compare",
  description: "Compare two Excel files easily and find differences quickly.",
  generator: "Excel Compare",
  keywords: [
    "Excel Compare",
    "Excel file difference",
    "Compare XLSX",
    "Excel tool",
    "CSV comparison",
  ],
  authors: [
    {
      name: "Usman Hasan",
      url: "http://usman-hasan-portfolio.surge.sh/",
      email: "usmanwasimhasan@gmail.com",
    },
  ],
  creator: "Usman Hasan",
  publisher: "Usman Hasan",
  robots: "index, follow", // SEO: allow indexing
  applicationName: "Excel Compare Tool",
  viewport: "width=device-width, initial-scale=1", // For responsive design
  themeColor: "#ffffff", // Useful for mobile browsers
  category: "Utilities",
  icons: {
    icon: "/favicon.svg", // Path to your favicon
  },
  openGraph: {
    title: "Excel Compare Tool",
    description: "A simple tool to compare Excel files side-by-side.",
    url: "https://excelcompare.site",
    siteName: "Excel Compare",
    images: [
      {
        url: "https://excelcompare.site/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Excel Compare Preview Image",
      },
    ],
    type: "website",
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
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <Suspense fallback={null}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
