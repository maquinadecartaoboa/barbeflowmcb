import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHANGE-PLAN] ${step}${detailsStr}`);
};

// Price ID resolution from env vars
const PRICE_MAP: Record<string, Record<string, string>> = {
  profissional: {
    month: "STRIPE_PRICE_PROFISSIONAL_MONTHLY",
    year: "STRIPE_PRICE_PROFISSIONAL_YEARLY",
  },
  ilimitado: {
    month: "STRIPE_PRICE_ILIMITADO_MONTHLY",
    year: "STRIPE_PRICE_ILIMITADO_YEARLY",
  },
};

// Fallback price IDs
const FALLBACK_PRICES: Record<string, string> = {
  STRIPE_PRICE_PROFISSIONAL_MONTHLY: "price_1T05HvCxw1gIFu9guQDhSvfs",
  STRIPE_PRICE_PROFISSIONAL_YEARLY: "price_1T05W3Cxw1gIFu9gKCNzmSvM",
  STRIPE_PRICE_ILIMITADO_MONTHLY: "price_1T40Q1Cxw1gIFu9gQgXMbjrr",
  STRIPE_PRICE_ILIMITADO_YEARLY: "price_1T40QcCxw1gIFu9g5oE9dpPM",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const body = await req.json();
    const { plan, billing_interval } = body;

    if (!plan || !["profissional", "ilimitado"].includes(plan)) {
      throw new Error("Plano inválido. Escolha 'profissional' ou 'ilimitado'.");
    }

    const interval = billing_interval || "month";
    if (!["month", "year"].includes(interval)) {
      throw new Error("Intervalo inválido. Escolha 'month' ou 'year'.");
    }

    // Resolve target price ID
    const envKey = PRICE_MAP[plan]?.[interval];
    if (!envKey) throw new Error(`Mapeamento de preço não encontrado para ${plan}/${interval}`);

    const priceId = Deno.env.get(envKey) || FALLBACK_PRICES[envKey];
    if (!priceId) throw new Error(`Price ID não encontrado para ${envKey}`);
    logStep("Target price resolved", { plan, interval, priceId });

    // Get tenant
    const { data: ut } = await supabaseAdmin
      .from("users_tenant")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!ut?.tenant_id) throw new Error("Tenant não encontrado");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("Nenhum cliente Stripe encontrado. Assine um plano primeiro.");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing
    if (subscriptions.data.length === 0) {
      const trialSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      if (trialSubs.data.length > 0) {
        subscriptions.data.push(...trialSubs.data);
      }
    }

    if (subscriptions.data.length === 0) {
      throw new Error("Nenhuma assinatura ativa encontrada.");
    }

    const sub = subscriptions.data[0];
    const currentPriceId = sub.items.data[0]?.price?.id;
    logStep("Current subscription", { subId: sub.id, currentPriceId });

    if (currentPriceId === priceId) {
      return new Response(JSON.stringify({ message: "Você já está neste plano.", already_on_plan: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update subscription with proration
    const updatedSub = await stripe.subscriptions.update(sub.id, {
      items: [
        {
          id: sub.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: "create_prorations",
    });

    logStep("Subscription updated", { newStatus: updatedSub.status, newPriceId: priceId });

    // Determine new plan name for message
    const planNames: Record<string, string> = {
      profissional: "Profissional",
      ilimitado: "Ilimitado",
    };

    return new Response(JSON.stringify({
      success: true,
      message: `Plano alterado para ${planNames[plan]} (${interval === "year" ? "anual" : "mensal"}) com sucesso!`,
      subscription_id: updatedSub.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
