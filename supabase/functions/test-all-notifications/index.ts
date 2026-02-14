import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppNotification, formatBrPhone, formatBRL } from "../_shared/whatsapp-notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const phone = "75999038366";
  const tenantId = "550e8400-e29b-41d4-a716-446655440000";
  const tenantSlug = "barberflow";
  const tenantName = "BarberFlow";
  const tenantAddress = "Rua das Flores, 123 - Centro, São Paulo - SP";
  const customerName = "Cliente Teste";
  const staffName = "Maria Costa";
  const serviceName = "Barba Premium: Estilo Impecável";
  const priceCents = 2000;
  const price = "R$ 20,00";
  const dateTime = "segunda-feira, 17 de fevereiro de 2026 às 14:00";
  const bookingId = "9d5d38d1-892b-409e-af05-8c15bbedb677";
  const subscriptionId = "ece4ed9a-9952-4b42-84af-e56f651d976b";
  const planName = "Plano Premium";
  const planPrice = "R$ 9,90";

  const results: { type: string; sent: boolean }[] = [];

  const messages: { type: string; message: string; extra?: Record<string, any> }[] = [
    // 1. booking_confirmed
    {
      type: "booking_confirmed",
      message: `✅ *Agendamento Confirmado!*\n\nOlá ${customerName}!\n\nSeu agendamento foi confirmado com sucesso.\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n👤 *Profissional:* ${staffName}\n💰 *Valor:* ${price}\n\n📍 *Local:* ${tenantName}\n📌 ${tenantAddress}\n\nAté lá! 👋`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 2. booking_reminder
    {
      type: "booking_reminder",
      message: `⏰ *Lembrete de Agendamento*\n\nOlá ${customerName}!\n\nSeu horário está chegando!\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n👤 *Profissional:* ${staffName}\n\n📍 *Local:* ${tenantName}\n📌 ${tenantAddress}\n\nTe esperamos! 🙂`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 3. booking_cancelled
    {
      type: "booking_cancelled",
      message: `❌ *Agendamento Cancelado*\n\nOlá ${customerName},\n\nSeu agendamento foi cancelado.\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n\nCaso queira reagendar, acesse nosso site.\n\nAtenciosamente,\n${tenantName}`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 4. booking_expired
    {
      type: "booking_expired",
      message: `⚠️ *Agendamento Expirado*\n\nOlá ${customerName},\n\nInfelizmente seu agendamento expirou por falta de pagamento.\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n\nCaso ainda queira agendar, acesse nosso site para escolher um novo horário.\n\nAtenciosamente,\n${tenantName}`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 5. payment_received
    {
      type: "payment_received",
      message: `💳 *Pagamento Confirmado!*\n\nOlá ${customerName}!\n\nRecebemos seu pagamento de ${price}.\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n👤 *Profissional:* ${staffName}\n\nSeu agendamento está confirmado! ✅\n\nAté lá! 👋\n${tenantName}`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 6. booking_no_show
    {
      type: "booking_no_show",
      message: `⚠️ *Falta Registrada*\n\nOlá ${customerName},\n\nIdentificamos que você não compareceu ao seu agendamento.\n\n📅 *Data:* ${dateTime}\n💇 *Serviço:* ${serviceName}\n👤 *Profissional:* ${staffName}\n\nCaso o agendamento tenha sido feito via pacote ou assinatura, a sessão foi contabilizada como utilizada.\n\nPara reagendar, acesse nosso site.\n\nAtenciosamente,\n${tenantName}`,
      extra: { booking_id: bookingId, customer_name: customerName },
    },
    // 7. subscription_activated
    {
      type: "subscription_activated",
      message: `🎉 *Assinatura Ativada!*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* foi ativada com sucesso.\n\n💰 *Valor:* ${planPrice}/mês\n\nVocê já pode agendar seus horários!\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 8. subscription_renewed
    {
      type: "subscription_renewed",
      message: `🔄 *Assinatura Renovada!*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* foi renovada com sucesso.\n\n💰 *Valor:* ${planPrice}\n📅 *Próximo ciclo:* 17/03/2026\n\nBom uso!\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 9. subscription_payment_failed
    {
      type: "subscription_payment_failed",
      message: `⚠️ *Falha no Pagamento*\n\nOlá ${customerName},\n\nNão conseguimos processar o pagamento da sua assinatura *${planName}*.\n\n💰 *Valor:* ${planPrice}\n\nPor favor, verifique seu método de pagamento para evitar a suspensão dos seus benefícios.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 10. subscription_near_block
    {
      type: "subscription_near_block",
      message: `🚨 *Atenção: Suspensão Próxima*\n\nOlá ${customerName},\n\nSua assinatura do plano *${planName}* está prestes a ser suspensa por falta de pagamento.\n\nRegularize seu pagamento para continuar aproveitando seus benefícios.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 11. subscription_suspended
    {
      type: "subscription_suspended",
      message: `⛔ *Assinatura Suspensa*\n\nOlá ${customerName},\n\nSua assinatura do plano *${planName}* foi suspensa por inadimplência.\n\nPara reativar, entre em contato conosco ou regularize o pagamento.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 12. subscription_cancelled
    {
      type: "subscription_cancelled",
      message: `❌ *Assinatura Cancelada*\n\nOlá ${customerName},\n\nSua assinatura do plano *${planName}* foi cancelada conforme solicitado.\n\nSeus benefícios permanecem válidos até o fim do ciclo atual.\n\nSentiremos sua falta! Caso queira voltar, estamos aqui.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 13. subscription_cancelled_auto
    {
      type: "subscription_cancelled_auto",
      message: `❌ *Assinatura Cancelada Automaticamente*\n\nOlá ${customerName},\n\nSua assinatura do plano *${planName}* foi cancelada automaticamente devido à inadimplência prolongada.\n\nCaso queira reativar, entre em contato conosco.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 14. subscription_paused
    {
      type: "subscription_paused",
      message: `⏸️ *Assinatura Pausada*\n\nOlá ${customerName},\n\nSua assinatura do plano *${planName}* foi pausada.\n\nDurante a pausa, seus benefícios ficam suspensos.\n\nPara reativar, acesse seu painel ou entre em contato.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 15. cycle_ends_3d
    {
      type: "cycle_ends_3d",
      message: `📅 *Lembrete: Renovação em 3 dias*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* será renovada em 3 dias.\n\n💰 *Valor:* ${planPrice}\n📅 *Renovação:* 17/02/2026\n\nCertifique-se de que seu pagamento está em dia!\n\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 16. cycle_ends_tomorrow
    {
      type: "cycle_ends_tomorrow",
      message: `⏰ *Lembrete: Renovação amanhã*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* será renovada amanhã.\n\n💰 *Valor:* ${planPrice}\n\nCertifique-se de que seu pagamento está em dia!\n\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 17. cycle_ends_today
    {
      type: "cycle_ends_today",
      message: `🔔 *Renovação Hoje*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* será renovada hoje.\n\n💰 *Valor:* ${planPrice}\n\nObrigado por continuar conosco!\n\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 18. recurring_weekly_summary
    {
      type: "recurring_weekly_summary",
      message: `📋 *Resumo Semanal - Seus Horários Fixos*\n\nOlá ${customerName}! Confira seus horários desta semana em *${tenantName}*:\n\n📅 *Segunda* às *14:00*\n💈 ${serviceName}\n👤 ${staffName}\n\n📅 *Quinta* às *10:00*\n💈 Corte Degradê\n👤 ${staffName}\n\n📍 ${tenantAddress}\n\nPrecisa remarcar? Entre em contato conosco.\n\nBoa semana! 💈`,
      extra: { customer_name: customerName },
    },
    // 19. subscription_resumed
    {
      type: "subscription_resumed",
      message: `▶️ *Assinatura Reativada!*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* foi reativada com sucesso.\n\nSeus benefícios estão novamente disponíveis!\n\nBom retorno!\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
    // 20. subscription_created (pending)
    {
      type: "subscription_created",
      message: `📝 *Assinatura Criada*\n\nOlá ${customerName}!\n\nSua assinatura do plano *${planName}* foi criada e está aguardando confirmação do pagamento.\n\n💰 *Valor:* ${planPrice}/mês\n\nAssim que o pagamento for confirmado, seus benefícios serão ativados.\n\nAtenciosamente,\n${tenantName}`,
      extra: { subscription_id: subscriptionId, customer_name: customerName, plan_name: planName },
    },
  ];

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    console.log(`[TEST] Sending ${i + 1}/${messages.length}: ${m.type}`);
    
    const sent = await sendWhatsAppNotification({
      supabase,
      tenantId,
      phone,
      message: m.message,
      eventType: m.type,
      tenantSlug,
      // No dedup key for testing — we want all to send
      extra: m.extra,
    });

    results.push({ type: m.type, sent });

    // 2s delay between messages to avoid flooding
    if (i < messages.length - 1) {
      await delay(2000);
    }
  }

  const summary = {
    total: results.length,
    sent: results.filter(r => r.sent).length,
    failed: results.filter(r => !r.sent).length,
    details: results,
  };

  console.log("[TEST] Summary:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
