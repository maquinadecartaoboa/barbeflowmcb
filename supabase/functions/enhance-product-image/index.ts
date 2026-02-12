import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, image_url } = await req.json();

    if (!product_id || !image_url) {
      return new Response(JSON.stringify({ error: 'product_id and image_url are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get product info for context
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('name')
      .eq('id', product_id)
      .single();

    if (prodError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Enhancing image for product: ${product.name}`);

    // Call Lovable AI Gateway to enhance the image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Transform this product photo into a professional barbershop/grooming product image. Make it look like a premium e-commerce product shot with:
- Dark moody barbershop-themed background with warm amber/gold lighting
- Professional studio-quality lighting on the product
- Subtle barbershop elements (wood texture, leather, razor, warm tones)
- Sharp focus and high contrast
- The product "${product.name}" should be the hero, centered and prominent
Keep the actual product exactly as it is, only enhance the presentation and background.`,
              },
              {
                type: 'image_url',
                image_url: { url: image_url },
              },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Erro ao processar imagem com IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error('No image in AI response:', JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: 'IA não retornou imagem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract base64 data and upload to storage
    const base64Match = generatedImage.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: 'Formato de imagem inválido' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Get tenant_id from product
    const { data: fullProduct } = await supabase
      .from('products')
      .select('tenant_id')
      .eq('id', product_id)
      .single();

    const fileName = `${fullProduct!.tenant_id}/products/enhanced-${product_id}-${Date.now()}.${imageFormat}`;

    const { error: uploadError } = await supabase.storage
      .from('tenant-media')
      .upload(fileName, binaryData, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar imagem melhorada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('tenant-media')
      .getPublicUrl(fileName);

    // Update product photo
    const { error: updateError } = await supabase
      .from('products')
      .update({ photo_url: publicUrl })
      .eq('id', product_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log(`Image enhanced successfully for product ${product_id}`);

    return new Response(JSON.stringify({ success: true, photo_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-product-image:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
