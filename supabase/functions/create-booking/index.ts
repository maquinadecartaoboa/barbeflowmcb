import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      tenant_id, 
      service_id, 
      staff_id, 
      customer_name, 
      customer_phone, 
      customer_email, 
      date, 
      time, 
      notes 
    } = await req.json();

    // Validate required fields
    if (!tenant_id || !service_id || !customer_name || !customer_phone || !date || !time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes, name')
      .eq('id', service_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse date and time
    const bookingDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    
    const startTime = new Date(bookingDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

    // Check if the time slot is still available
    const { data: existingBookings, error: bookingCheckError } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant_id)
      .gte('starts_at', startTime.toISOString())
      .lt('starts_at', endTime.toISOString())
      .in('status', ['confirmed', 'pending']);

    if (bookingCheckError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Time slot is no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or get customer
    let customerId: string;

    // First, try to find existing customer by phone
    const { data: existingCustomer, error: customerSearchError } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('phone', customer_phone)
      .maybeSingle();

    if (customerSearchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to search for customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer info if provided
      await supabase
        .from('customers')
        .update({
          name: customer_name,
          email: customer_email || null,
        })
        .eq('id', customerId);
    } else {
      // Create new customer
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          name: customer_name,
          phone: customer_phone,
          email: customer_email || null,
        })
        .select('id')
        .single();

      if (customerCreateError || !newCustomer) {
        return new Response(
          JSON.stringify({ error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = newCustomer.id;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id,
        service_id,
        staff_id: staff_id || null,
        customer_id: customerId,
        starts_at: startTime.toISOString(),
        ends_at: endTime.toISOString(),
        status: 'confirmed',
        notes: notes || null,
        created_via: 'public',
      })
      .select(`
        *,
        service:services(name, price_cents),
        staff:staff(name),
        customer:customers(name, phone, email)
      `)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Booking created:', booking);

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: {
          id: booking.id,
          service_name: booking.service?.name,
          staff_name: booking.staff?.name,
          customer_name: booking.customer?.name,
          date: startTime.toLocaleDateString('pt-BR'),
          time: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          price: booking.service?.price_cents ? (booking.service.price_cents / 100) : 0,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating booking:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});