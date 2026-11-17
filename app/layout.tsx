import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Operacional | Demonstração",
  description: "Demonstração de painel integrado para segurança patrimonial.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
