-- Allow buyer_id to be NULL initially
ALTER TABLE public.transactions ALTER COLUMN buyer_id DROP NOT NULL;

-- Update the constraint to allow NULL buyer
ALTER TABLE public.transactions DROP CONSTRAINT must_have_different_buyer_seller;
ALTER TABLE public.transactions ADD CONSTRAINT must_have_different_buyer_seller CHECK (buyer_id != seller_id OR buyer_id IS NULL);

-- Drop old policies
DROP POLICY IF EXISTS "View transactions" ON public.transactions;
DROP POLICY IF EXISTS "Insert transactions" ON public.transactions;

-- New Policies
CREATE POLICY "View transactions" ON public.transactions FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR (buyer_id IS NULL AND status = 'CREATED') OR public.is_admin());

CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = seller_id AND buyer_id IS NULL);
