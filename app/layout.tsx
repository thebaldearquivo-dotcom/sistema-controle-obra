import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Produção e Diário de Obra V7",
  description: "Sistema para controle de produção, diário de obra, fotos no Google Drive, equipe, materiais e produtividade.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
