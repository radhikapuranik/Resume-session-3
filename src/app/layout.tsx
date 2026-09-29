import type { Metadata } from "next";
import { Newsreader, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ variable: "--font-serif-display", subsets: ["latin"], style: ["normal", "italic"] });
const sans = Instrument_Sans({ variable: "--font-sans-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kargo Shortlist",
  description: "Rubric-scored shortlist of PM / SPM applicants for Kargo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
