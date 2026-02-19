import type { Metadata } from "next";
import TermsPage from "@/views/Terms";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de uso da plataforma modoGESTOR. Informações sobre planos, preços, trial gratuito, cancelamento, taxas e responsabilidade sobre dados.",
  openGraph: {
    title: "Termos de Uso | modoGESTOR",
    description:
      "Termos de uso da plataforma modoGESTOR. Informações sobre planos, preços, trial gratuito, cancelamento e responsabilidade sobre dados.",
    url: "https://www.modogestor.com.br/termos",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Termos de Uso | modoGESTOR",
    description: "Termos de uso da plataforma modoGESTOR.",
  },
  alternates: {
    canonical: "https://www.modogestor.com.br/termos",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Termos de Uso - modoGESTOR",
  description:
    "Termos de uso da plataforma modoGESTOR para profissionais de serviços.",
  url: "https://www.modogestor.com.br/termos",
  inLanguage: "pt-BR",
  isPartOf: {
    "@type": "WebSite",
    name: "modoGESTOR",
    url: "https://www.modogestor.com.br",
  },
  dateModified: "2026-02-12",
};

export default function Termos() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TermsPage />
    </>
  );
}
