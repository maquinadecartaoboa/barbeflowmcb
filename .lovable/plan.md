

## Diagnosis: Why Reminders Are Not Being Sent

### The Problem (with data)

**Adriano Alves**: Only **1 out of 48** bookings got a 24h reminder (2% success rate)
**WS BARBEARIA**: Only **9 out of 51** bookings got a 24h reminder (18% success rate)

### Root Cause: The 24h Window Is Too Narrow

The current logic searches for bookings in a **30-minute window** around exactly 24 hours from now:

```text
now + 23h45m  ←→  now + 24h15m
         (only 30 min wide)
```

This fails in two critical scenarios:

1. **Admin/recurring bookings created less than 24h before the appointment** -- These never enter the 24h window. Example: Gilson Silva was created at 13:39 UTC for 16:00 UTC same day (only 2.3h before). The 24h window already passed before the booking existed.

2. **Recurring bookings materialized late** -- The `process-recurring-bookings` cron materializes bookings with ~48h lookahead, but if it runs after the narrow 24h window has passed, the reminder is lost. Example: JOTAPEL's recurring booking was materialized at 15:14 UTC for 10:00 UTC same day -- already past the appointment time.

### The Fix

Change from a narrow "time band" approach to a **sweep** approach:

**24h reminder**: Find ALL confirmed bookings where:
- `starts_at` is between now and now + 24h
- `reminder_sent = false`
- No existing `reminder_24h` dedup entry

**1h reminder**: Find ALL confirmed bookings where:
- `starts_at` is between now and now + 1h
- No existing `reminder_1h` dedup entry

This guarantees that any booking -- whether created months ago or 2 hours before -- will be caught by the next cron run (every minute).

### Changes Required

**1 file**: `supabase/functions/send-booking-reminders/index.ts`

Replace the narrow window queries with sweep queries:

```text
BEFORE (narrow window):
  windowStart = now + 23h45m
  windowEnd   = now + 24h15m
  → Misses bookings created < 24h before

AFTER (sweep):
  24h: starts_at BETWEEN now AND now+24h, reminder_sent=false, no dedup
  1h:  starts_at BETWEEN now AND now+1h, no dedup
  → Catches ALL pending bookings regardless of creation time
```

No database changes needed. The dedup table already prevents double-sending.

