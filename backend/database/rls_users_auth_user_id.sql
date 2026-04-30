-- =============================================================================
-- Spotnere: Add auth_user_id to users table + update user-side RLS policies
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run)
--
-- What this does:
--   1. Adds auth_user_id column to users table (same pattern as vendors)
--   2. Updates user-side RLS policies to use auth_user_id = auth.uid()
--      instead of id = auth.uid() / user_id = auth.uid()
--   3. Vendor-side policies are NOT touched — they remain unchanged
--
-- Safety:
--   - users.id stays unchanged → zero FK breakage
--   - auth_user_id is nullable → existing users work until they log in (lazy migration)
--   - Backend uses service_role key → bypasses RLS entirely (no impact)
--   - Vendor policies use vendors.auth_user_id (separate column, separate table)
-- =============================================================================


-- =============================================================================
-- PART 0: Add auth_user_id column to users (safe to re-run)
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;


-- =============================================================================
-- PART 1: Drop existing user-side policies (by exact name from rls_policies_v2)
-- =============================================================================

-- users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- bookings table (user-side only; vendor-side is in the same policy via OR)
DROP POLICY IF EXISTS "bookings_select_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_vendor" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;

-- user_places (favorites)
DROP POLICY IF EXISTS "user_places_select_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_insert_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_update_own" ON public.user_places;
DROP POLICY IF EXISTS "user_places_delete_own" ON public.user_places;

-- reviews (write policies only — select is public and stays unchanged)
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;


-- =============================================================================
-- PART 2: Recreate users table policies using auth_user_id
-- =============================================================================

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());


-- =============================================================================
-- PART 3: Recreate bookings policies with JOIN-based user check
-- The vendor OR branch remains the same (vendors.auth_user_id = auth.uid())
-- =============================================================================

CREATE POLICY "bookings_select_own_or_vendor"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = bookings.user_id
        AND u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = bookings.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_update_own_or_vendor"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = bookings.user_id
        AND u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = bookings.user_id
        AND u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.place_id = bookings.place_id
        AND v.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = bookings.user_id
        AND u.auth_user_id = auth.uid()
    )
  );


-- =============================================================================
-- PART 4: Recreate user_places (favorites) policies with JOIN-based check
-- =============================================================================

CREATE POLICY "user_places_select_own"
  ON public.user_places FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_places.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "user_places_insert_own"
  ON public.user_places FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_places.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "user_places_update_own"
  ON public.user_places FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_places.user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_places.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "user_places_delete_own"
  ON public.user_places FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_places.user_id
        AND u.auth_user_id = auth.uid()
    )
  );


-- =============================================================================
-- PART 5: Recreate reviews write policies with JOIN-based check
-- (reviews_select_public stays unchanged — it's public read for everyone)
-- =============================================================================

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = reviews.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = reviews.user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = reviews.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = reviews.user_id
        AND u.auth_user_id = auth.uid()
    )
  );


-- =============================================================================
-- Done! Verify with:
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, cmd;
-- =============================================================================
