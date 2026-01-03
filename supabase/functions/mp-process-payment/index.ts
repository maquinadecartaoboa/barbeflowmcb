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
    const { 
      booking_id, 
      token, 
      payment_method_id, 
      installments = 1,
      payer 
    } = await req.json();
    
    console.log('Processing payment for booking:', booking_id);

    if (!booking_id || !token || !payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, token, payment_method_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get booking with tenant, service, and customer data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        tenant:tenants(*),
        service:services(*),
        customer:customers(*)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get MP connection
    const { data: mpConnection, error: mpError } = await supabase
      .from('mercadopago_connections')
      .select('access_token')
      .eq('tenant_id', booking.tenant_id)
      .single();

    if (mpError || !mpConnection?.access_token) {
      console.error('MP connection not found:', mpError);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount
    const settings = booking.tenant?.settings || {};
    const servicePriceCents = booking.service?.price_cents || 0;
    const requirePrepayment = settings.require_prepayment || false;
    const prepaymentPercentage = settings.prepayment_percentage || 0;
    
    let amountCents = servicePriceCents;
    if (requirePrepayment && prepaymentPercentage > 0 && prepaymentPercentage < 100) {
      amountCents = Math.round(servicePriceCents * prepaymentPercentage / 100);
    }

    // Check/create payment record
    let paymentRecord;
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .single();

    if (existingPayment) {
      paymentRecord = existingPayment;
    } else {
      const { data: newPayment, error: createError } = await supabase
        .from('payments')
        .insert({
          tenant_id: booking.tenant_id,
          booking_id: booking_id,
          amount_cents: amountCents,
          status: 'pending',
          provider: 'mercadopago',
          currency: 'BRL',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating payment:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create payment record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      paymentRecord = newPayment;
    }

    // Process payment via MP API
    console.log('Creating payment in Mercado Pago...');
    const mpPaymentBody = {
      transaction_amount: amountCents / 100,
      token: token,
      description: `${booking.service?.name || 'Serviço'} - ${booking.tenant?.name || 'Barbearia'}`,
      installments: installments,
      payment_method_id: payment_method_id,
      payer: {
        email: payer?.email || booking.customer?.email || 'cliente@example.com',
        identification: payer?.identification || undefined,
      },
      external_reference: booking_id,
      metadata: {
        booking_id: booking_id,
        payment_id: paymentRecord.id,
        tenant_id: booking.tenant_id,
      },
    };

    console.log('MP Payment body:', JSON.stringify(mpPaymentBody, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConnection.access_token}`,
        'X-Idempotency-Key': `${booking_id}-${Date.now()}`,
      },
      body: JSON.stringify(mpPaymentBody),
    });

    const mpResult = await mpResponse.json();
    console.log('MP Response:', JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error('MP payment error:', mpResult);
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      return new Response(
        JSON.stringify({ 
          error: 'Payment processing failed',
          mp_error: mpResult,
          status: 'rejected'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map MP status to our status
    let paymentStatus = 'pending';
    let bookingStatus = booking.status;
    
    switch (mpResult.status) {
      case 'approved':
        paymentStatus = 'paid';
        bookingStatus = 'confirmed';
        break;
      case 'pending':
      case 'in_process':
        paymentStatus = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
        paymentStatus = 'failed';
        break;
    }

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        external_id: mpResult.id?.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id);

    // Update booking status if payment approved
    if (bookingStatus !== booking.status) {
      await supabase
        .from('bookings')
        .update({ 
          status: bookingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);
    }

    console.log('Payment processed successfully:', mpResult.id, 'Status:', mpResult.status);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentRecord.id,
        mp_payment_id: mpResult.id,
        status: mpResult.status,
        status_detail: mpResult.status_detail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-process-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
