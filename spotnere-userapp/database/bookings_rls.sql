-- Bookings Table RLS for Spotnere
-- Run this in Supabase SQL Editor if the app cannot fetch bookings
--
-- The app uses custom auth (users table) + Supabase anon key.
-- If RLS blocks reads, you have two options:

-- OPTION 1: Disable RLS (simplest - allows app to read bookings)
-- WARNING: This allows any client to read all bookings. Use only if
-- you restrict access elsewhere or for development.
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Enable RLS but allow anon to read (for development)
-- This still exposes all bookings to any client. For production,
-- consider moving booking reads to your backend API.
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read bookings" ON bookings
--   FOR SELECT USING (true);
