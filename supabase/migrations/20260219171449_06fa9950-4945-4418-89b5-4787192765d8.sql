-- Allow public (anon) to read payment status by ID (needed for PIX polling on public booking page)
CREATE POLICY "Public read payment status by id"
  ON public.payments
  FOR SELECT
  USING (true);