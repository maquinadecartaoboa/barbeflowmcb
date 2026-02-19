

# Plano: Landing Page de Alta Conversao focada em Assinaturas e Receita Recorrente

## Contexto

A Landing Page atual (`src/pages/Landing.tsx`) e generica -- vende "agendamento + gestao". O sistema ja possui um motor completo de assinaturas recorrentes (Mercado Pago), pacotes de servicos, comissoes, caixa e WhatsApp. O que falta e uma narrativa de vendas focada no valor principal: **receita recorrente garantida**.

Este plano transforma a Landing Page de "ferramenta de agendamento" para "sistema de receita recorrente para barbeiros empreendedores".

---

## Mudancas Planejadas

### 1. Nova Secao Hero -- Copy focada em Receita Recorrente

Substituir o headline generico por copy que toca na dor financeira:

- **Headline**: "Pare de matar um leao por dia. Garanta seu aluguel logo no dia 01."
- **Subtitulo**: "Transforme clientes eventuais em membros fieis do seu clube. Crie planos de assinatura e pacotes de servicos em segundos."
- **CTA principal**: "Quero Criar Meu Clube de Assinatura Agora"
- **Badges abaixo**: "14 dias gratis", "Cobranca automatica", "Sem fiado"

### 2. Calculadora de Receita Recorrente (novo componente interativo)

Adicionar logo abaixo do hero uma secao com fundo diferenciado (gradiente gold/dark) contendo:

- **Input 1**: "Quantos clientes fieis voce tem hoje?" (slider ou input numerico, default 30)
- **Input 2**: "Valor do plano mensal?" (currency input, default R$ 80,00)
- **Resultado dinamico**: "Voce pode comecar o mes com **R$ 2.400,00 GARANTIDOS** na conta."
- Animacao nos numeros (contagem progressiva)
- Botao CTA abaixo: "Comecar a Faturar Agora"

Novo arquivo: `src/components/landing/RevenueCalculator.tsx`

### 3. Secao "Clube de Assinatura" (nova secao dedicada)

Secao com fundo escuro premium (preto/gold) entre Features e Depoimentos, com 4 bullets de beneficios:

- "O Fim da Agenda Vazia" -- crie seu clube de assinatura
- "Fidelizacao Automatica" -- quem assina nao corta no concorrente
- "Cobranca no Piloto Automatico" -- sem fiado, debito automatico
- "Previsibilidade de Caixa" -- saiba quanto entra antes de trabalhar

Cada bullet com icone contextual e micro-animacao ao entrar na viewport.

### 4. Mockup do Cliente Final (ajuste na secao Showcase)

Atualizar a secao "Para seu Negocio" existente:

- Trocar o floating card "Confirmado R$45" por um card mostrando **"Plano VIP Ativo -- Proximo agendamento: Gratis"**
- Trocar o floating card "Novo agendamento" por **"Assinante desde Jan/2025 -- 4 cortes este mes"**
- Reforcar a ideia de status/experiencia premium para o cliente final

### 5. Depoimento Focado em Assinatura

Substituir um dos depoimentos existentes por um focado em receita recorrente:

- "Antes eu nao sabia se ia conseguir pagar as contas na semana fraca. Hoje, com 40 assinantes no modoGESTOR, eu ja pago o aluguel e a luz no dia 5. O resto e lucro." -- Barbearia do Joao

### 6. Reordenacao das Features

Mover "Pacotes e Assinaturas" para a primeira posicao no grid de features (atualmente e o ultimo item), renomear para **"Clube de Assinatura Recorrente"** e trocar o icone para `Crown` (VIP).

### 7. FAQ Atualizado

Adicionar 2 novas perguntas ao FAQ:

- "Como funciona o Clube de Assinatura?" -- Explica que o barbeiro cria planos, o cliente paga automaticamente todo mes, e os agendamentos ficam como R$0,00.
- "Posso usar meu proprio dominio?" -- Sim, no plano Profissional voce pode ter seudominio.com.br em vez de modogestor.com/seudominio.

---

## Detalhes Tecnicos

### Arquivos a criar
- `src/components/landing/RevenueCalculator.tsx` -- componente interativo com useState para clientes/valor, calculo dinamico, animacao de numeros com framer-motion

### Arquivos a modificar
- `src/pages/Landing.tsx` -- reestruturacao do hero, reordenacao de features, nova secao Clube, ajuste dos floating cards, depoimento atualizado, FAQ expandido, import do RevenueCalculator

### Dependencias
- Nenhuma nova dependencia necessaria. Usa framer-motion (ja instalado), componentes UI existentes (Button, Badge, Input/Slider), e CurrencyInput existente.

### Padrao de design
- Manter o dark mode premium ja existente (bg-[hsl(240,6%,4%)])
- Secao da calculadora com gradiente gold sutil (from-primary/10)
- Secao do clube com borda primary/30 para destaque
- Numeros financeiros em tamanho grande com cor primary (gold)
- Animacoes consistentes com as existentes (framer-motion, ease curves)

