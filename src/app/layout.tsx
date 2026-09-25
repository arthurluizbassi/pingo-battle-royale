import type { Metadata, Viewport } from "next";
import { Nunito, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixelify = Pixelify_Sans({ variable: "--font-pixelify", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pingo Battle Royale",
  description: "Faça as atividades, equipe seu Pingo e entre na arena.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffd23f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${pixelify.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
