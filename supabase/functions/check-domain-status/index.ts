import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ut } = await supabase
      .from("users_tenant")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!ut) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("cloudflare_hostname_id, custom_domain, cloudflare_status")
      .eq("id", ut.tenant_id)
      .single();

    if (!tenant?.cloudflare_hostname_id) {
      return new Response(JSON.stringify({ status: "none", domain: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Cloudflare
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${tenant.cloudflare_hostname_id}`,
      {
        headers: { Authorization: `Bearer ${cfToken}` },
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      return new Response(
        JSON.stringify({ status: "error", domain: tenant.custom_domain }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hostname = cfData.result;
    let newStatus = "pending";

    if (hostname.status === "active" && hostname.ssl?.status === "active") {
      newStatus = "active";
    } else if (hostname.status === "moved" || hostname.status === "deleted") {
      newStatus = "error";
    } else {
      newStatus = "pending";
    }

    // Update DB
    if (newStatus !== tenant.cloudflare_status) {
      await supabase
        .from("tenants")
        .update({ cloudflare_status: newStatus })
        .eq("id", ut.tenant_id);
    }

    // Build DNS records from verification data
    const verificationRecords = hostname.ownership_verification || {};
    const sslValidation = hostname.ssl?.validation_records || [];

    const dnsRecords = [
      {
        type: "CNAME",
        name: tenant.custom_domain,
        value: hostname.custom_origin_server || "modogestor.com.br",
        description: "Aponte seu domínio para nosso servidor",
      },
      ...(verificationRecords.name
        ? [{
            type: verificationRecords.type || "TXT",
            name: verificationRecords.name,
            value: verificationRecords.value,
            description: "Registro de verificação de propriedade",
          }]
        : []),
      ...sslValidation.map((r: any) => ({
        type: r.txt_name ? "TXT" : "CNAME",
        name: r.txt_name || r.cname,
        value: r.txt_value || r.cname_target,
        description: "Registro de validação SSL",
      })),
    ];

    return new Response(
      JSON.stringify({
        status: newStatus,
        domain: tenant.custom_domain,
        ssl_status: hostname.ssl?.status,
        hostname_status: hostname.status,
        dns_records: dnsRecords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
