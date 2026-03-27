

# Plan: UX/UI do Agendamento — Diagnóstico e Correções Restantes

## Current State Assessment

After thorough code review, many items from the prompt are **already implemented**:

| Item | Status | Details |
|------|--------|---------|
| Admin: Services filtered by staff_services | DONE | BookingModal lines 393-415 |
| Admin: Reset service when staff changes | DONE | BookingModal lines 410-415 |
| Comanda: Services filtered by booking staff | DONE | ComandaItemsSection lines 86-103 |
| Public: Staff filtered by selected service | DONE | BookingPublic `eligibleStaff` memo, lines 1054-1066 |
| Public: Auto-select if only 1 eligible staff | DONE | Hides "Qualquer" option when eligibleStaff.length === 1 |
| BookingCard: Items filtered by staff column | DONE | BookingCard lines 28-32 |
| BookingCard: Duration per staff | DONE | BookingCard lines 34-38 |
| BookingCard: has_conflict red ring + AlertTriangle | DONE | BookingCard line 47, lines 50-54 |
| BookingCard: Secondary card dashed border | DONE | BookingCard line 47 |
| Comanda: total_price_cents on insert | DONE | ComandaItemsSection line 115 |
| Comanda: Total efetivo computed from items | DONE | ComandaItemsSection `totalItems` reduce |

## What Still Needs Work

### 1. Admin BookingModal: Staff should be required (Priority 1)
**Problem**: `staff_id` in the Zod schema is `z.string().optional()` (line 48). Admin can submit without selecting a staff member.  
**Fix**: Make staff_id required in the schema. Show a validation message when empty.  
**File**: `src/components/modals/BookingModal.tsx`
- Change schema: `staff_id: z.string().min(1, "Profissional é obrigatório")`
- Remove "Qualquer profissional" option from SelectItem (or keep it but label it differently)
- Remove the `value="none"` fallback SelectItem

### 2. Admin BookingModal: Conflict confirmation dialog (Priority 1)
**Problem**: When admin picks an occupied (amber) slot, the booking is created with `allow_overlap: true` silently — no explicit confirmation dialog.  
**Fix**: Before submitting, if the selected slot is occupied/conflicting, show an AlertDialog asking the admin to confirm the override.  
**File**: `src/components/modals/BookingModal.tsx`
- Add state for `showConflictDialog` and `pendingFormData`
- In `handleSubmit`, check `hasConflict` — if true, set pending data and show dialog instead of submitting
- On dialog confirm, proceed with submission; on cancel, return to form

### 3. Public: "Qualquer profissional" should only fetch slots for eligible staff (Priority 3)
**Problem**: When client picks "Qualquer disponível", `selectedStaff` is set to `null`, and `loadAvailableSlots` sends `staff_id: null` to the edge function. The edge function then returns slots for ALL staff — including those who don't offer the service.  
**Fix**: When staff is null but a service is selected, pass eligible staff IDs to the slots function. Since the edge function only accepts a single `staff_id`, the simplest approach is to fetch slots for each eligible staff member, or rely on the backend trigger validation (which already blocks at INSERT time).  
**Assessment**: The backend trigger `trg_check_staff_service` already blocks invalid bookings. The edge function `get-available-slots` also filters by staff schedule. The risk is showing a time slot that belongs to a staff member who doesn't offer the service — but the booking creation would fail. This is a low-priority refinement since the public prompt data shows only 2 errors (pre-fix).

### 4. Public: Show "no staff available" message (Priority 3)
**Problem**: If no staff offers the selected service, the eligibleStaff array is empty and step 2 shows no options.  
**Fix**: Add a fallback message in step 2 when `eligibleStaff.length === 0`.  
**File**: `src/pages/BookingPublic.tsx`

## Technical Details

### File Changes

**`src/components/modals/BookingModal.tsx`**:
- Line 48: Change `staff_id: z.string().optional()` to `staff_id: z.string().min(1, "Selecione um profissional")`
- Line 918: Remove `<SelectItem value="none">Qualquer profissional</SelectItem>`
- Lines 620-728: Wrap `handleSubmit` with conflict check — if selected slot has `hasConflict`, show AlertDialog before proceeding
- Add AlertDialog import and state variables for conflict confirmation flow
- Add `conflictDialogOpen`, `pendingSubmitData` state
- In form submit: intercept when conflict detected, store data, show dialog
- Dialog confirm: call actual submit with stored data
- Dialog cancel: close dialog, let admin pick another slot

**`src/pages/BookingPublic.tsx`**:
- After line 1741 (end of eligibleStaff.map): Add empty state message when `eligibleStaff.length === 0`

### No database changes required
All backend triggers and validations are already in place.

