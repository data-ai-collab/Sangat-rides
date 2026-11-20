import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const body = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });
const pa = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: ["500", "700"], variable: "--font-pa" });

export const metadata: Metadata = {
  title: "Sangat Rides · Revesby Gurdwara",
  description: "Sunday lifts to and from Sri Guru Singh Sabha, Revesby for elderly Sangat, by volunteer drivers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14213d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${body.variable} ${pa.variable}`}>
      <body className="font-sans min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
