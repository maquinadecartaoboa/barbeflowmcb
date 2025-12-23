-- Create storage bucket for tenant media (logo and cover images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-media', 'tenant-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tenant media
CREATE POLICY "Public read tenant media"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-media');

-- Allow authenticated users who belong to the tenant to upload/update/delete
CREATE POLICY "Tenant members can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Tenant members can update media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Tenant members can delete media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-media' 
  AND auth.role() = 'authenticated'
);