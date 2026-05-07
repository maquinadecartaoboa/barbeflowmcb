import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REDIRECT_TO = "https://app.modogestor.com.br/auth/callback";
const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVITE-STAFF] ${step}${d}`);
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const supabaseClient = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ error: "User not authenticated" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => null);
    const staffId = body?.staff_id;
    const emailRaw = body?.email;
    if (!staffId || !emailRaw) {
      return jsonResponse({ error: "staff_id and email are required" }, 400);
    }
    const email = String(emailRaw).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("id, tenant_id, active, user_id, name")
      .eq("id", staffId)
      .maybeSingle();

    if (staffErr) {
      log("Staff lookup error", { staffErr });
      return jsonResponse({ error: "Failed to load staff" }, 500);
    }
    if (!staff) return jsonResponse({ error: "Staff not found" }, 404);
    if (!staff.active) return jsonResponse({ error: "Staff is not active" }, 400);
    if (staff.user_id) return jsonResponse({ error: "Staff already has a login account" }, 409);

    const { data: callerRole } = await supabaseAdmin
      .from("users_tenant")
      .select("role")
      .eq("user_id", callerId)
      .eq("tenant_id", staff.tenant_id)
      .maybeSingle();

    if (!callerRole || !ADMIN_ROLES.has(callerRole.role)) {
      return jsonResponse({ error: "Only admins can invite staff" }, 403);
    }

    log("Inviting", { staffId, email, tenantId: staff.tenant_id });
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: REDIRECT_TO },
    );

    if (inviteErr || !inviteData?.user) {
      const msg = inviteErr?.message ?? "unknown";
      log("Invite failed", { msg });
      if (/already.*registered|already.*exist|user_already_exists/i.test(msg)) {
        return jsonResponse(
          { error: "Email already registered with another account" },
          409,
        );
      }
      return jsonResponse({ error: "Failed to send invitation" }, 500);
    }

    const newUserId = inviteData.user.id;
    log("Invite sent", { newUserId });

    const { error: updateErr } = await supabaseAdmin
      .from("staff")
      .update({ user_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", staffId);

    if (updateErr) {
      log("UPDATE staff failed — attempting rollback", { updateErr });
      const { error: rollbackErr } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (rollbackErr) {
        log("Rollback delete failed — orphan user remains", {
          rollbackErr,
          orphanUserId: newUserId,
        });
      }
      return jsonResponse(
        { error: "Failed to link account (rollback may be needed)", orphan_user_id: newUserId },
        500,
      );
    }

    const { error: insertErr } = await supabaseAdmin
      .from("users_tenant")
      .insert({ user_id: newUserId, tenant_id: staff.tenant_id, role: "staff" });

    if (insertErr) {
      log("INSERT users_tenant failed — attempting rollback", { insertErr });
      // Try to undo: clear staff.user_id and delete the auth user
      await supabaseAdmin.from("staff").update({ user_id: null }).eq("id", staffId);
      const { error: rollbackErr } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (rollbackErr) {
        log("Rollback delete failed — orphan user remains", {
          rollbackErr,
          orphanUserId: newUserId,
        });
      }
      return jsonResponse(
        { error: "Failed to link account (rollback may be needed)", orphan_user_id: newUserId },
        500,
      );
    }

    log("Done", { staffId, newUserId });
    return jsonResponse(
      {
        success: true,
        staff_id: staffId,
        user_id: newUserId,
        email,
        invitation_sent: true,
      },
      200,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Unhandled error", { msg });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
