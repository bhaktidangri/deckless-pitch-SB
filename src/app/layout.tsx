import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The one editorial touch across an otherwise clean, functional dashboard —
// used sparingly for page/section headlines (see globals.css's `font-display`
// utility and PageHeader) so the whole portal reads as a designed product
// rather than a generic admin template, without turning every label into a
// serif and hurting legibility in dense data views.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Deck-less Pitch — AI-Powered Vendor-to-Buyer Solution Platform",
  description:
    "No deck. A live model of your business you explore yourself. Vendors register their Solution DNA once; buyers get a personalized, evidence-grounded solution experience.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
