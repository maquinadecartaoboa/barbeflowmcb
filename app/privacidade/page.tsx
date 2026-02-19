import type { Metadata } from "next";
import PrivacyPage from "@/views/Privacy";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de privacidade da plataforma modoGESTOR. Saiba como coletamos, utilizamos e protegemos seus dados pessoais em conformidade com a LGPD.",
  openGraph: {
    title: "Política de Privacidade | modoGESTOR",
    description:
      "Política de privacidade da plataforma modoGESTOR. Conformidade com a LGPD, dados coletados, finalidade e direitos do titular.",
    url: "https://www.modogestor.com.br/privacidade",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Política de Privacidade | modoGESTOR",
    description: "Política de privacidade da plataforma modoGESTOR.",
  },
  alternates: {
    canonical: "https://www.modogestor.com.br/privacidade",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Política de Privacidade - modoGESTOR",
  description:
    "Política de privacidade da plataforma modoGESTOR em conformidade com a LGPD.",
  url: "https://www.modogestor.com.br/privacidade",
  inLanguage: "pt-BR",
  isPartOf: {
    "@type": "WebSite",
    name: "modoGESTOR",
    url: "https://www.modogestor.com.br",
  },
  dateModified: "2026-02-12",
};

export default function Privacidade() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PrivacyPage />
    </>
  );
}
