-- Add razorpay_contact_ref column to vendors table
-- Run this in your Supabase SQL Editor

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS razorpay_contact_ref TEXT;
