import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FFC300",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.modogestor.com.br"),
  title: {
    default: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    template: "%s | modoGESTOR",
  },
  description:
    "Plataforma completa de gestão e agendamento online para profissionais de serviços. Clientes agendam sem cadastro, você gerencia tudo em um só lugar.",
  authors: [{ name: "modoGESTOR" }],
  creator: "modoGESTOR",
  publisher: "modoGESTOR",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.modogestor.com.br",
    siteName: "modoGESTOR",
    title: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    description:
      "Plataforma completa de gestão e agendamento online para profissionais de serviços. Clientes agendam sem cadastro, você gerencia tudo em um só lugar.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@modogestor",
    creator: "@modogestor",
    title: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    description:
      "Plataforma completa de gestão e agendamento online para profissionais de serviços.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "modoGESTOR",
  },
  alternates: {
    canonical: "https://www.modogestor.com.br",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
