/*
# Profile photo uploads (avatars bucket)

1. New storage
- Public bucket `avatars` for profile photos. Each file is at `<user id>/<file name>`.
- Limits: 2 MB per file, images only (JPEG, PNG, WebP).

2. Security
- Signed-in users can upload, replace and delete only files inside their own folder (the folder named with their user id).
- Anyone can view avatar files through their public link, which is what the app shows next to a name.
- Nothing else in the storage system is opened to users.

3. Notes
- Re-running this migration is safe: the bucket is updated if it already exists and the policies are recreated.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "insert_own_avatar_files" ON storage.objects;
CREATE POLICY "insert_own_avatar_files" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_avatar_files" ON storage.objects;
CREATE POLICY "update_own_avatar_files" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_avatar_files" ON storage.objects;
CREATE POLICY "delete_own_avatar_files" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
