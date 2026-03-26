-- Number of 1-hour slots for this booking (default 1; multi-hour = count of selected slots).
-- Run once in Supabase: Dashboard → SQL Editor → New query → Run.
-- If PostgREST still errors, wait ~1 min or Project Settings → API → Reload schema.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_hours integer NOT NULL DEFAULT 1;

UPDATE public.bookings
SET duration_hours = 1
WHERE duration_hours IS NULL;

COMMENT ON COLUMN public.bookings.duration_hours IS 'Count of 1-hour slots booked; mirrors client selectedTimeSlots.length.';
