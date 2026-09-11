import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canoas Recicla com a Gente",
  description: "Gestão de frota e rotas de coleta para as cooperativas de reciclagem do projeto Canoas Recicla com a Gente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body text-body-md">
        {children}
      </body>
    </html>
  );
}
