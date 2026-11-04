import { supabase } from '@/lib/supabase';

const POSTER_BUCKET = 'show-posters';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validatePosterFile(file: File): string | null {
  if (!EXTENSIONS[file.type]) return 'Sube una imagen en formato JPG, PNG o WebP.';
  if (file.size > MAX_FILE_BYTES) return 'La imagen no puede pesar más de 5 MB.';
  return null;
}

export async function uploadShowPoster(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage.from(POSTER_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl;
}
