-- =============================================================================
-- Spotnere RLS Policies v2 — Option C (Hybrid)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run)
--
-- Architecture:
--   • Backend (Express) uses SUPABASE_SERVICE_ROLE_KEY → bypasses RLS entirely
--   • Vendor app will use Supabase Auth → gets JWT → auth.uid() resolves
--   • User app stays on backend API for now (no direct Supabase calls)
--   • anon key gets read-only access to public catalog data
--
-- Prerequisites:
--   1. vendors.auth_user_id column must exist (Part 0 below creates it)
--   2. After vendor signs up via Supabase Auth, set vendors.auth_user_id = auth.uid()
--   3. Backend service role keeps working unchanged — RLS does NOT affect it
-- =============================================================================


-- =============================================================================
-- PART 0: Schema additions (safe to re-run)
-- =============================================================================

-- Link vendors to Supabase Auth users
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_auth_user_id
  ON public.vendors (auth_user_id)
  WHERE auth_user_id IS NOT NULL;


-- =============================================================================
-- PART 1: Drop all existing policies (idempotent — safe to re-run)
-- =============================================================================

-- users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_select_for_vendor" ON public.users;

-- places
DROP POLICY IF EXISTS "places_select_public" ON public.places;
DROP POLICY IF EXISTS "places_insert_vendor" ON public.places;
DROP POLICY IF EXISTS "places_update_vendor_owner" ON public.places;
DROP POLICY IF EXISTS "places_delete_vendor_owner" ON public.places;

-- bookings
DROP POLICY IF EXISTS "bookings_select_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;

-- user_places
DROP POLICY IF EXISTS "user_places_select_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_insert_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_update_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_delete_own" ON public.user_places;

-- reviews
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;

-- gallery_images
DROP POLICY IF EXISTS "gallery_images_select_public" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_insert_vendor" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_update_vendor" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_delete_vendor" ON public.gallery_images;

-- vendors
DROP POLICY IF EXISTS "vendors_select_own" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_own" ON public.vendors;

-- vendor_notifications
DROP POLICY IF EXISTS "vendor_notifications_select_own" ON public.vendor_notifications;
DROP POLICY IF EXISTS "vendor_notifications_update_own" ON public.vendor_notifications;


-- =============================================================================
-- PART 2: Enable RLS on all tables
-- =============================================================================

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_places          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- PART 3: users
-- Customers own their row. Vendors can read limited user info for bookings.
-- Backend (service role) handles all user CRUD — these policies are defense-in-depth.
-- =============================================================================

-- Customers see only their own row
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Only the user themselves can insert their row (backend handles this via service role)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Only the user themselves can update their row
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- =============================================================================
-- PART 4: places
-- Public catalog — anyone can read. Only the owning vendor can write.
-- =============================================================================

-- Anyone (anon or authenticated) can browse places
CREATE POLICY "places_select_public"
  ON public.places FOR SELECT
  TO anon, authenticated
  USING (true);

-- Vendor can update only their own place
CREATE POLICY "places_update_vendor_owner"
  ON public.places FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = places.id
        AND v.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = places.id
        AND v.auth_user_id = auth.uid()
    )
  );

-- Vendor can delete only their own place
CREATE POLICY "places_delete_vendor_owner"
  ON public.places FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = places.id
        AND v.auth_user_id = auth.uid()
    )
  );

-- No INSERT policy for places via client — registration creates place + vendor
-- atomically through the backend (service role). This prevents orphan places.


-- =============================================================================
-- PART 5: bookings
-- Customers see their own. Vendors see bookings for their place.
-- All inserts/payment updates go through backend (service role).
-- =============================================================================

-- Customer sees own bookings; vendor sees bookings for their place
CREATE POLICY "bookings_select_own_or_vendor"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

-- Customer can create a booking (user_id must match)
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Customer or vendor for that place can update (e.g. status changes)
CREATE POLICY "bookings_update_own_or_vendor"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

-- Only the customer who made the booking can delete (cancel) it
CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- PART 6: user_places (favorites)
-- Customer-only. Vendor app doesn't touch this table.
-- Backend handles all ops via service role.
-- =============================================================================

CREATE POLICY "user_places_select_own"
  ON public.user_places FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_places_insert_own"
  ON public.user_places FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_places_update_own"
  ON public.user_places FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_places_delete_own"
  ON public.user_places FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- PART 7: reviews
-- Public read (catalog). Customers write their own.
-- Vendor app reads reviews for their place (covered by public SELECT).
-- =============================================================================

CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- PART 8: gallery_images
-- Public read. Vendor can manage images for their own place.
-- =============================================================================

CREATE POLICY "gallery_images_select_public"
  ON public.gallery_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "gallery_images_insert_vendor"
  ON public.gallery_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = gallery_images.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "gallery_images_update_vendor"
  ON public.gallery_images FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = gallery_images.place_id
        AND v.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = gallery_images.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "gallery_images_delete_vendor"
  ON public.gallery_images FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = gallery_images.place_id
        AND v.auth_user_id = auth.uid()
    )
  );


-- =============================================================================
-- PART 9: vendors
-- A vendor can only see and edit their own row.
-- Never exposes password_hash to anyone via the anon/authenticated key.
-- =============================================================================

CREATE POLICY "vendors_select_own"
  ON public.vendors FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "vendors_update_own"
  ON public.vendors FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- No INSERT policy — vendor registration goes through backend (service role)
-- which creates the place + vendor atomically and sets auth_user_id.
-- No DELETE policy — vendors can't self-delete from client.


-- =============================================================================
-- PART 10: vendor_notifications
-- Vendor sees only their own notifications. Inserts come from backend.
-- =============================================================================

CREATE POLICY "vendor_notifications_select_own"
  ON public.vendor_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_notifications.vendor_id
        AND v.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_notifications_update_own"
  ON public.vendor_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_notifications.vendor_id
        AND v.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_notifications.vendor_id
        AND v.auth_user_id = auth.uid()
    )
  );

-- No INSERT/DELETE for client — backend creates notifications on payment success.


-- =============================================================================
-- PART 11: Storage bucket "places_images" (optional — run if not already set up)
-- =============================================================================

-- Make sure the bucket exists and is public-readable
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('places_images', 'places_images', true)
--   ON CONFLICT (id) DO NOTHING;

-- Anyone can view images (public bucket)
-- CREATE POLICY "Public read places_images"
--   ON storage.objects FOR SELECT
--   TO anon, authenticated
--   USING (bucket_id = 'places_images');

-- Authenticated vendors can upload to their place folder
-- CREATE POLICY "Vendor upload places_images"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'places_images'
--     AND EXISTS (
--       SELECT 1 FROM public.vendors v
--       WHERE v.auth_user_id = auth.uid()
--         AND (storage.foldername(name))[1] = v.place_id::text
--     )
--   );

-- Authenticated vendors can delete from their place folder
-- CREATE POLICY "Vendor delete places_images"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'places_images'
--     AND EXISTS (
--       SELECT 1 FROM public.vendors v
--       WHERE v.auth_user_id = auth.uid()
--         AND (storage.foldername(name))[1] = v.place_id::text
--     )
--   );


-- =============================================================================
-- Done! Verify with:
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, cmd;
-- =============================================================================
