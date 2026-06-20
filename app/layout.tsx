import type { Metadata } from "next";
import { Big_Shoulders, Inter, Newsreader } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], variable: "--ff-display" });
const body = Inter({ subsets: ["latin"], variable: "--ff-body" });
const serif = Newsreader({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--ff-serif",
});

export const metadata: Metadata = {
  title: "HoopFind",
  description: "Find nearby basketball games that match your level.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
