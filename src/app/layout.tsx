import type { Metadata, Viewport } from "next";
import { Jersey_10, Nunito } from "next/font/google";
import "./globals.css";

// chunky pixel face (Forager-like) for titles, buttons and numbers; Nunito keeps body text easy to read
const gameFont = Jersey_10({ weight: "400", variable: "--font-game", subsets: ["latin", "latin-ext"] });
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
      <body className={`${gameFont.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
