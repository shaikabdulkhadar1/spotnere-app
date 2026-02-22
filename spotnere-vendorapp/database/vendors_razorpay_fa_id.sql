-- Add razorpay_fa_id column to vendors table (Razorpay fund account id for payouts)
-- Run this in your Supabase SQL Editor

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS razorpay_fa_id TEXT;
