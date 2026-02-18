/**
 * Places Table Schema
 * Stores place/venue information
 */

CREATE TABLE IF NOT EXISTS public.places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  country TEXT,
  city TEXT,
  state TEXT,
  phone_number TEXT,
  category TEXT,
  sub_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_country ON public.places(country);
CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);
CREATE INDEX IF NOT EXISTS idx_places_category ON public.places(category);
