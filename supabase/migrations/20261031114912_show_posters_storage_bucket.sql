/*
# Show cover uploads (show-posters bucket)

1. New storage
- Public bucket `show-posters` for series cover images. Files are stored at the root of the bucket with a generated name.
- Limits: 5 MB per file, images only (JPEG, PNG, WebP).

2. Security
- Anyone can view cover files through their public link, which is what the catalog shows.
- Only the administrator (checked with is_admin()) can upload, replace or delete cover files.
- Listing the bucket contents is not opened to anyone.

3. Notes
- Re-running this migration is safe: the bucket is updated if it already exists and the policies are recreated.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('show-posters', 'show-posters', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "admin_insert_show_posters" ON storage.objects;
CREATE POLICY "admin_insert_show_posters" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'show-posters' AND is_admin());

DROP POLICY IF EXISTS "admin_update_show_posters" ON storage.objects;
CREATE POLICY "admin_update_show_posters" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'show-posters' AND is_admin())
WITH CHECK (bucket_id = 'show-posters' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_show_posters" ON storage.objects;
CREATE POLICY "admin_delete_show_posters" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'show-posters' AND is_admin());
