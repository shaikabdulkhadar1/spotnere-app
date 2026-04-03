-- =============================================================================
-- Spotnere: Row Level Security policies (Supabase / Postgres)
-- Run in Supabase SQL Editor after reviewing prerequisites.
--
-- Notes:
-- - The backend uses SUPABASE_SERVICE_ROLE_KEY; the service role BYPASSES RLS.
--   Your Express API keeps working unchanged.
-- - These policies apply to: anon key, authenticated JWT (Supabase Auth), and
--   any client using the PostgREST API without the service role.
-- - public.users.id MUST equal auth.users.id (same UUID) for end-user policies.
--   Migrate existing users or use Supabase Auth as source of truth for new users.
-- - Vendors: add auth_user_id (below) and set it to the vendor's auth.users.id
--   when they sign in with Supabase Auth (or link accounts).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 0: Optional schema (safe to run; add FKs for RLS joins)
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_auth_user_id
  ON public.vendors (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.vendors.auth_user_id IS
  'Supabase Auth user id for this vendor; used for RLS. Set when vendor uses Supabase Auth.';

-- -----------------------------------------------------------------------------
-- PART 1: Drop existing policies (idempotent re-run)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

DROP POLICY IF EXISTS "places_select_public" ON public.places;
DROP POLICY IF EXISTS "places_insert_authenticated_vendor" ON public.places;
DROP POLICY IF EXISTS "places_update_vendor_owner" ON public.places;
DROP POLICY IF EXISTS "places_delete_vendor_owner" ON public.places;

DROP POLICY IF EXISTS "bookings_select_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;

DROP POLICY IF EXISTS "user_places_select_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_insert_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_update_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_delete_own" ON public.user_places;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;

DROP POLICY IF EXISTS "gallery_images_select_public" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_insert_vendor" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_update_vendor" ON public.gallery_images;
DROP POLICY IF EXISTS "gallery_images_delete_vendor" ON public.gallery_images;

DROP POLICY IF EXISTS "vendors_select_own" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_own" ON public.vendors;

DROP POLICY IF EXISTS "vendor_notifications_select_own" ON public.vendor_notifications;
DROP POLICY IF EXISTS "vendor_notifications_update_own" ON public.vendor_notifications;

-- -----------------------------------------------------------------------------
-- PART 2: Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PART 3: users — own row only (hides password_hash from others)
-- -----------------------------------------------------------------------------
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- PART 4: places — public catalog read; writes for vendor linked to place
-- -----------------------------------------------------------------------------
CREATE POLICY "places_select_public"
  ON public.places FOR SELECT
  TO anon, authenticated
  USING (true);

-- Inserts: typically done by your API (service role). If vendors insert via
-- Supabase client after auth, allow when they own the future vendor row for that place
-- is created in same transaction — simplest is service-only for INSERT.
-- Uncomment if you add client-side place creation with auth:
-- CREATE POLICY "places_insert_authenticated_vendor"
--   ON public.places FOR INSERT TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.vendors v
--       WHERE v.auth_user_id = auth.uid()
--     )
--   );

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

CREATE POLICY "places_delete_vendor_owner"
  ON public.places FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = places.id
        AND v.auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- PART 5: bookings — customer owns by user_id; vendor sees rows for their place
-- -----------------------------------------------------------------------------
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

CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

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

CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- PART 6: user_places (favorites)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PART 7: reviews — public read; write only as own user_id
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PART 8: gallery_images — public read; mutate only vendor for that place
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PART 9: vendors — never expose password_hash to public; own row only
-- -----------------------------------------------------------------------------
CREATE POLICY "vendors_select_own"
  ON public.vendors FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "vendors_update_own"
  ON public.vendors FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- PART 10: vendor_notifications
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- Storage (optional): bucket "places_images" — tighten in Dashboard or SQL
-- Example (adjust paths/roles as needed):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('places_images', 'places_images', true)
--   ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Public read places_images" ON storage.objects FOR SELECT TO anon, authenticated
--   USING (bucket_id = 'places_images');
-- CREATE POLICY "Vendor upload places_images" ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'places_images' AND auth.role() = 'authenticated');
-- =============================================================================
