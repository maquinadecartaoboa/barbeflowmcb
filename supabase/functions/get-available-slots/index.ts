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

    const { tenant_id, service_id, staff_id, date } = await req.json();

    if (!tenant_id || !service_id || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant settings
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = tenant.settings || {};
    const slotDuration = settings.slot_duration || 15; // minutes
    const bufferTime = settings.buffer_time || 10; // minutes

    // Get schedules for the specified date
    const targetDate = new Date(date);
    const weekday = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const schedulesQuery = supabase
      .from('schedules')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('weekday', weekday)
      .eq('active', true);

    if (staff_id) {
      schedulesQuery.eq('staff_id', staff_id);
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery;

    if (schedulesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ slots: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing bookings for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsQuery = supabase
      .from('bookings')
      .select('starts_at, ends_at, staff_id')
      .eq('tenant_id', tenant_id)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .in('status', ['confirmed', 'pending']);

    if (staff_id) {
      bookingsQuery.eq('staff_id', staff_id);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get blocks for the date
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('starts_at, ends_at, staff_id')
      .eq('tenant_id', tenant_id)
      .lte('starts_at', endOfDay.toISOString())
      .gte('ends_at', startOfDay.toISOString());

    if (blocksError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch blocks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate available slots
    const slots: string[] = [];
    const serviceDurationWithBuffer = service.duration_minutes + bufferTime;

    for (const schedule of schedules) {
      const startTime = parseTime(schedule.start_time);
      const endTime = parseTime(schedule.end_time);
      const breakStart = schedule.break_start ? parseTime(schedule.break_start) : null;
      const breakEnd = schedule.break_end ? parseTime(schedule.break_end) : null;

      let currentTime = startTime;
      
      while (currentTime + serviceDurationWithBuffer <= endTime) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration_minutes);

        // Skip if slot is in the past
        if (slotStart <= new Date()) {
          currentTime += slotDuration;
          continue;
        }

        // Check if slot conflicts with break time
        if (breakStart && breakEnd) {
          const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
          
          if (!(slotEndMinutes <= breakStart || slotStartMinutes >= breakEnd)) {
            currentTime += slotDuration;
            continue;
          }
        }

        // Check if slot conflicts with existing bookings
        const hasBookingConflict = (bookings || []).some((booking) => {
          const bookingStart = new Date(booking.starts_at);
          const bookingEnd = new Date(booking.ends_at);
          
          return !(slotEnd <= bookingStart || slotStart >= bookingEnd);
        });

        if (hasBookingConflict) {
          currentTime += slotDuration;
          continue;
        }

        // Check if slot conflicts with blocks
        const hasBlockConflict = (blocks || []).some((block) => {
          if (staff_id && block.staff_id && block.staff_id !== staff_id) {
            return false;
          }
          
          const blockStart = new Date(block.starts_at);
          const blockEnd = new Date(block.ends_at);
          
          return !(slotEnd <= blockStart || slotStart >= blockEnd);
        });

        if (hasBlockConflict) {
          currentTime += slotDuration;
          continue;
        }

        // Slot is available
        slots.push(slotStart.toTimeString().substring(0, 5));
        currentTime += slotDuration;
      }
    }

    return new Response(
      JSON.stringify({ slots: slots.sort() }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating slots:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}