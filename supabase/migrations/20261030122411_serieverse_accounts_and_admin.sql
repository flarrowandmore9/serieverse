/*
# SerieVerse accounts, personal lists, suggestions and admin permissions

1. New Tables
- `profiles`: one row per account (name, email, chosen character avatar, admin flag).
  Created automatically when someone signs up.
- `user_folders`: personal folders/sublists per user. Four default folders are created on sign-up.
- `user_list_items`: which catalog series each user saved and in which folder.
- `suggestions`: feedback sent from the "Sugerencias" page. Anyone can send one;
  only the administrator can read, update status or delete them.

2. Functions
- `is_admin()`: true when the signed-in user has the admin flag.
- `handle_new_user()` trigger: creates the profile and default folders on sign-up.
  The admin flag is set only for the official administrator email.
- `delete_my_account()`: lets a user delete their own account.
- `admin_delete_user(uuid)`: lets the administrator delete another account.

3. Security
- RLS enabled on every new table.
- Users can only read and change their own profile fields (name, avatar). The admin flag cannot be changed by users.
- Personal lists and folders are visible only to their owner.
- Admins can insert, update and delete catalog series (shows) through the app.
- Suggestions: anyone can insert; only the administrator can read, update status, or delete.
- Functions are not callable by anonymous visitors.

4. Important notes
- Email confirmation is off, so the administrator must sign up with the official admin email before anyone else does.
- Re-running is safe: statements use IF NOT EXISTS or DROP ... IF EXISTS before creating policies.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  email text NOT NULL,
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_folders (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name)
);

CREATE TABLE IF NOT EXISTS user_list_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id bigint NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, show_id),
  FOREIGN KEY (user_id, folder) REFERENCES user_folders(user_id, name)
);

CREATE INDEX IF NOT EXISTS user_list_items_user_idx ON user_list_items (user_id);

CREATE TABLE IF NOT EXISTS suggestions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  email text CHECK (email IS NULL OR char_length(email) <= 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'Por hacer' CHECK (status IN ('Por hacer', 'Prioridad', 'En proceso', 'Completada')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    lower(NEW.email) = 'flarrowandmoreweb@gmail.com'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_folders (user_id, name)
  VALUES (NEW.id, 'General'), (NEW.id, 'Viendo'), (NEW.id, 'Pendientes'), (NEW.id, 'Favoritas')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF target = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta desde el panel de administración';
  END IF;
  DELETE FROM auth.users WHERE id = target;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (name, avatar_url) ON profiles TO authenticated;
GRANT ALL ON profiles, user_folders, user_list_items, suggestions TO service_role;

DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON profiles;
CREATE POLICY "select_own_or_admin_profiles" ON profiles FOR SELECT
  TO authenticated USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT ON user_folders TO authenticated;

DROP POLICY IF EXISTS "select_own_folders" ON user_folders;
CREATE POLICY "select_own_folders" ON user_folders FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_folders" ON user_folders;
CREATE POLICY "insert_own_folders" ON user_folders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON user_list_items TO authenticated;
GRANT UPDATE (folder) ON user_list_items TO authenticated;

DROP POLICY IF EXISTS "select_own_list" ON user_list_items;
CREATE POLICY "select_own_list" ON user_list_items FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_list" ON user_list_items;
CREATE POLICY "insert_own_list" ON user_list_items FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_list" ON user_list_items;
CREATE POLICY "update_own_list" ON user_list_items FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_list" ON user_list_items;
CREATE POLICY "delete_own_list" ON user_list_items FOR DELETE
  TO authenticated USING (user_id = auth.uid());

GRANT INSERT (user_id, name, email, message) ON suggestions TO anon, authenticated;
GRANT SELECT, DELETE ON suggestions TO authenticated;
GRANT UPDATE (status) ON suggestions TO authenticated;

DROP POLICY IF EXISTS "anyone_insert_suggestions" ON suggestions;
CREATE POLICY "anyone_insert_suggestions" ON suggestions FOR INSERT
  TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "admin_select_suggestions" ON suggestions;
CREATE POLICY "admin_select_suggestions" ON suggestions FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_suggestions" ON suggestions;
CREATE POLICY "admin_update_suggestions" ON suggestions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_suggestions" ON suggestions;
CREATE POLICY "admin_delete_suggestions" ON suggestions FOR DELETE
  TO authenticated USING (public.is_admin());

GRANT INSERT (tvmaze_id, title, synopsis_es, us_platforms, es_platforms) ON shows TO authenticated;
GRANT UPDATE (title, synopsis_es, us_platforms, es_platforms) ON shows TO authenticated;
GRANT DELETE ON shows TO authenticated;

DROP POLICY IF EXISTS "admin_insert_shows" ON shows;
CREATE POLICY "admin_insert_shows" ON shows FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_shows" ON shows;
CREATE POLICY "admin_update_shows" ON shows FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_shows" ON shows;
CREATE POLICY "admin_delete_shows" ON shows FOR DELETE
  TO authenticated USING (public.is_admin());
