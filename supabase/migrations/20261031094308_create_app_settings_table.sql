/*
# Create app_settings table

1. New Tables
- `app_settings`
  - `key` (text, primary key): identificador del texto editable (ej: `nav_catalog`, `hero_title`).
  - `value` (text, not null): el texto que se muestra en la app.
  - `updated_at` (timestamptz): fecha de la última modificación.
2. Security
- Enable RLS on `app_settings`.
- Grant SELECT to `anon, authenticated` para que cualquiera pueda leer los textos.
- Grant INSERT, UPDATE, DELETE to `authenticated` solo para admins (via is_admin()).
- Políticas: lectura pública; escritura solo para administradora.
3. Seed data
- Inserta los textos por defecto del menú y la portada.
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON app_settings TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_app_settings" ON app_settings;
CREATE POLICY "public_read_app_settings"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_insert_app_settings" ON app_settings;
CREATE POLICY "admin_insert_app_settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_app_settings" ON app_settings;
CREATE POLICY "admin_update_app_settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_app_settings" ON app_settings;
CREATE POLICY "admin_delete_app_settings"
  ON app_settings FOR DELETE
  TO authenticated
  USING (is_admin());

INSERT INTO app_settings (key, value) VALUES
  ('nav_catalog', 'Catálogo'),
  ('nav_calendar', 'Calendario'),
  ('nav_platforms', 'Plataformas y Cadenas'),
  ('nav_library', 'Mis Listas'),
  ('nav_suggestions', 'Sugerencias'),
  ('hero_title', 'SerieVerse'),
  ('hero_subtitle', 'Tu catálogo de series de televisión de EE. UU. y España'),
  ('btn_download', 'Descargar App')
ON CONFLICT (key) DO NOTHING;
