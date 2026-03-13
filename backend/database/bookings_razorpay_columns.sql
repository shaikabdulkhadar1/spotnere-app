-- Add Razorpay payment columns to bookings table
-- Run this in Supabase SQL Editor if verify/update fails with column errors

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_received_by_vendor NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_error TEXT;
