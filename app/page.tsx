import type { Metadata } from "next";
import LandingWrapper from "@/components/LandingWrapper";

export const metadata: Metadata = {
  title: "modoGESTOR - Sistema de Gestão e Agendamento para Barbeiros e Profissionais de Serviços",
  description:
    "Crie seu Clube de Assinatura, tenha receita recorrente garantida e gerencie agendamentos, clientes, finanças e equipe em uma só plataforma. 14 dias grátis.",
  keywords: [
    "sistema para barbearia",
    "gestão para barbeiros",
    "agendamento online barbearia",
    "clube de assinatura barbearia",
    "software para salão",
    "agendamento online",
    "gestão de serviços",
    "plataforma para barbeiros",
    "receita recorrente barbearia",
    "sistema de agendamento",
    "modoGESTOR",
  ],
  openGraph: {
    title: "modoGESTOR - Sistema de Gestão para Barbeiros e Profissionais de Serviços",
    description:
      "Crie seu Clube de Assinatura, tenha receita recorrente garantida e gerencie agendamentos, clientes, finanças e equipe. 14 dias grátis.",
    url: "https://www.modogestor.com.br",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "modoGESTOR - Gestão para Profissionais de Serviços",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "modoGESTOR - Gestão para Barbeiros e Profissionais de Serviços",
    description:
      "Crie seu Clube de Assinatura e tenha receita recorrente garantida. 14 dias grátis.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.modogestor.com.br",
  },
};

// JSON-LD structured data for the homepage
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "modoGESTOR",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Plataforma completa de gestão e agendamento online para profissionais de serviços. Clube de assinatura, agendamento online, gestão financeira e mais.",
  url: "https://www.modogestor.com.br",
  image: "https://www.modogestor.com.br/og-image.png",
  author: {
    "@type": "Organization",
    name: "modoGESTOR",
    url: "https://www.modogestor.com.br",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Plano Essencial",
      price: "59.90",
      priceCurrency: "BRL",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      description: "Agendamento online, gestão de clientes, financeiro completo, notificações automáticas e mais.",
    },
    {
      "@type": "Offer",
      name: "Plano Profissional",
      price: "89.90",
      priceCurrency: "BRL",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      description: "Tudo do Essencial + domínio personalizado, chatbot WhatsApp e taxa reduzida.",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "500",
    bestRating: "5",
    worstRating: "1",
  },
};

// JSON-LD for FAQ
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Como funciona o Clube de Assinatura?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Você cria planos recorrentes (ex: Corte + Barba ilimitados por R$ 99,90/mês). Seu cliente assina, o cartão é debitado automaticamente todo mês, e os agendamentos dele passam a ser R$ 0,00. Você começa o mês com receita garantida na conta.",
      },
    },
    {
      "@type": "Question",
      name: "Posso usar meu próprio domínio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim! No plano Profissional, você pode ter seudominio.com.br em vez de modogestor.com/seudominio. Seu cliente acessa sua página com a sua marca.",
      },
    },
    {
      "@type": "Question",
      name: "Preciso de cartão de crédito para o trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim, mas você NÃO é cobrado durante os 14 dias. Cancele a qualquer momento antes do fim do trial sem nenhum custo.",
      },
    },
    {
      "@type": "Question",
      name: "Posso trocar de plano depois?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim, a qualquer momento. O Stripe prorratea automaticamente — você paga apenas a diferença proporcional.",
      },
    },
    {
      "@type": "Question",
      name: "Como funciona a taxa sobre transações?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Quando seus clientes pagam pelo sistema (assinaturas, pacotes, pagamentos online), cobramos uma pequena taxa sobre o valor processado: 2,5% no Essencial ou 1,0% no Profissional.",
      },
    },
    {
      "@type": "Question",
      name: "Funciona para outros tipos de negócio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim! Além de barbearias, o modoGESTOR funciona para salões, manicures, estúdios de estética e outros profissionais de serviços.",
      },
    },
    {
      "@type": "Question",
      name: "E se eu cancelar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Você mantém acesso até o fim do período pago. Seus dados ficam guardados por 90 dias caso queira voltar.",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Server-rendered semantic content for SEO crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>modoGESTOR - Sistema de Gestão e Agendamento para Barbeiros e Profissionais de Serviços</h1>
        <p>
          Plataforma completa de gestão e agendamento online para profissionais de serviços.
          Crie seu Clube de Assinatura, tenha receita recorrente garantida e gerencie
          agendamentos, clientes, finanças e equipe em uma só plataforma. 14 dias grátis.
        </p>
        <h2>Recursos</h2>
        <ul>
          <li>Clube de Assinatura Recorrente - Crie planos VIP com cobrança automática</li>
          <li>Agendamento Online 24/7 - Clientes agendam a qualquer hora, sem criar conta</li>
          <li>Gestão de Equipe - Cadastre profissionais e acompanhe a performance</li>
          <li>WhatsApp Automático - Confirmações e lembretes automáticos</li>
          <li>Pagamento Antecipado - Integração com Mercado Pago</li>
          <li>Dashboard Financeiro - Receita, comissões e métricas em tempo real</li>
        </ul>
        <h2>Planos e Preços</h2>
        <p>Plano Essencial: R$ 59,90/mês - Agendamento online, gestão de clientes, financeiro completo</p>
        <p>Plano Profissional: R$ 89,90/mês - Tudo do Essencial + domínio personalizado e chatbot WhatsApp</p>
        <h2>Perguntas Frequentes</h2>
        <p>Como funciona o Clube de Assinatura? Crie planos recorrentes e receba automaticamente todo mês.</p>
        <p>Funciona para outros negócios? Sim! Barbearias, salões, manicures, estúdios de estética e mais.</p>
      </div>
      <LandingWrapper />
    </>
  );
}
