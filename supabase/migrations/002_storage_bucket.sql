-- Create storage bucket for tour images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-images',
  'tour-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tour-images bucket

-- Allow public read access to tour images
CREATE POLICY "Public read access for tour images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-images');

-- Allow authenticated users to upload tour images
CREATE POLICY "Authenticated users can upload tour images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tour-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update tour images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tour-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete tour images
CREATE POLICY "Authenticated users can delete tour images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tour-images'
  AND auth.role() = 'authenticated'
);
