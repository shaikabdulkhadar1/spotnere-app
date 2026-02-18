-- Add number_of_guests column to bookings table
-- Run this in Supabase SQL Editor

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER;
