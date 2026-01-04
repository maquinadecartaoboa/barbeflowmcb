import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, remote_jid, limit = 50 } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection from database
    const { data: connection, error: fetchError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (fetchError || !connection) {
      console.error("Connection not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "WhatsApp not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = connection.evolution_instance_name;
    console.log(`Syncing messages for instance: ${instanceName}, remote_jid: ${remote_jid || "all"}`);

    let syncedCount = 0;
    let contacts: string[] = [];

    // If a specific remote_jid is provided, sync only that conversation
    if (remote_jid) {
      contacts = [remote_jid];
    } else {
      // Fetch all contacts/chats first
      console.log("Fetching contacts list...");
      try {
        const contactsResponse = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`, {
          method: "POST",
          headers: {
            "apikey": EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ where: {} }),
        });

        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          console.log(`Found ${contactsData?.length || 0} contacts`);
          
          // Filter to only get regular chats (not groups or broadcast)
          contacts = (contactsData || [])
            .filter((c: any) => c.id && c.id.includes("@s.whatsapp.net"))
            .map((c: any) => c.id)
            .slice(0, 20); // Limit to 20 contacts to avoid timeout
        }
      } catch (e) {
        console.error("Failed to fetch contacts:", e);
      }
    }

    console.log(`Processing ${contacts.length} contacts`);

    // Fetch messages for each contact
    for (const contactJid of contacts) {
      try {
        console.log(`Fetching messages for: ${contactJid}`);
        
        const messagesResponse = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
          method: "POST",
          headers: {
            "apikey": EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: contactJid,
              },
            },
            limit: Math.min(limit, 100),
          }),
        });

        if (!messagesResponse.ok) {
          console.error(`Failed to fetch messages for ${contactJid}:`, messagesResponse.status);
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData?.messages || messagesData || [];
        console.log(`Found ${messages.length} messages for ${contactJid}`);

        // Process and save each message
        for (const msg of messages) {
          const key = msg.key || {};
          const messageId = key.id;
          const remoteJid = key.remoteJid || contactJid;
          const fromMe = key.fromMe ?? false;

          if (!messageId || !remoteJid) continue;
          if (remoteJid === "status@broadcast") continue;

          // Extract message content
          let content = "";
          let messageType = "text";
          let mediaUrl = null;

          const msgContent = msg.message;
          if (msgContent) {
            if (msgContent.conversation) {
              content = msgContent.conversation;
            } else if (msgContent.extendedTextMessage?.text) {
              content = msgContent.extendedTextMessage.text;
            } else if (msgContent.imageMessage) {
              messageType = "image";
              content = msgContent.imageMessage.caption || "[Imagem]";
              mediaUrl = msgContent.imageMessage.url;
            } else if (msgContent.audioMessage) {
              messageType = "audio";
              content = "[Áudio]";
            } else if (msgContent.videoMessage) {
              messageType = "video";
              content = msgContent.videoMessage.caption || "[Vídeo]";
            } else if (msgContent.documentMessage) {
              messageType = "document";
              content = msgContent.documentMessage.fileName || "[Documento]";
            } else if (msgContent.stickerMessage) {
              messageType = "sticker";
              content = "[Sticker]";
            }
          }

          if (!content && msg.pushName) {
            content = `[Mensagem de ${msg.pushName}]`;
          }

          // Get message timestamp
          const timestamp = msg.messageTimestamp;
          const messageTimestampDate = timestamp
            ? new Date(Number(timestamp) * 1000).toISOString()
            : new Date().toISOString();

          // Upsert message into database
          const { error: insertError } = await supabase
            .from("whatsapp_messages")
            .upsert({
              tenant_id: tenant_id,
              remote_jid: remoteJid,
              message_id: messageId,
              from_me: fromMe,
              message_type: messageType,
              content: content || "[Mensagem sem conteúdo]",
              media_url: mediaUrl,
              timestamp: messageTimestampDate,
              status: fromMe ? "sent" : "received",
            }, {
              onConflict: "tenant_id,message_id",
            });

          if (insertError) {
            console.error("Error inserting message:", insertError);
          } else {
            syncedCount++;
          }
        }
      } catch (e) {
        console.error(`Error syncing messages for ${contactJid}:`, e);
      }
    }

    console.log(`Sync complete. Total messages synced: ${syncedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        synced_count: syncedCount,
        contacts_processed: contacts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in evolution-sync-messages:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
