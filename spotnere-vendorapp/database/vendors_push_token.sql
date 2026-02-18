-- Add push_token column to vendors table for Expo push notifications
-- Run this in your Supabase SQL Editor

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS push_token TEXT;
