-- Add photo_url column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for service photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to service photos
CREATE POLICY "Public read service photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

-- Allow authenticated users to upload service photos for their tenant
CREATE POLICY "Tenant users can upload service photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their service photos
CREATE POLICY "Tenant users can update service photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their service photos
CREATE POLICY "Tenant users can delete service photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-photos' 
  AND auth.role() = 'authenticated'
);