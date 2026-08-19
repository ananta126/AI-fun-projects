import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { AppProvider } from "@/components/providers/AppProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LOOKBOOK — Find your style. Make it yours.",
    template: "%s | LOOKBOOK",
  },
  description:
    "Discover outfits, save inspiration, and find looks that work for you. A premium fashion discovery platform.",
  openGraph: {
    title: "LOOKBOOK — Find your style. Make it yours.",
    description: "Discover outfits, save inspiration, and find looks that work for you.",
    type: "website",
    siteName: "LOOKBOOK",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased bg-background text-foreground">
        <ThemeProvider>
          <AppProvider>
            <Header />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <MobileNav />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
