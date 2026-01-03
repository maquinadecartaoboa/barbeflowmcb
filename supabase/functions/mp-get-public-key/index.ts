import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, slug } = await req.json();
    
    console.log('Getting public key for tenant:', tenant_id || slug);

    if (!tenant_id && !slug) {
      return new Response(
        JSON.stringify({ error: 'tenant_id or slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get tenant_id from slug if needed
    let resolvedTenantId = tenant_id;
    if (!resolvedTenantId && slug) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single();

      if (tenantError || !tenant) {
        console.error('Tenant not found:', tenantError);
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resolvedTenantId = tenant.id;
    }

    // Get MP connection with public_key
    const { data: mpConnection, error: mpError } = await supabase
      .from('mercadopago_connections')
      .select('public_key')
      .eq('tenant_id', resolvedTenantId)
      .single();

    if (mpError || !mpConnection) {
      console.error('MP connection not found:', mpError);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mpConnection.public_key) {
      console.error('Public key not found in connection');
      return new Response(
        JSON.stringify({ error: 'Public key not configured. Please reconnect Mercado Pago.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Public key found for tenant:', resolvedTenantId);

    return new Response(
      JSON.stringify({ public_key: mpConnection.public_key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-get-public-key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
