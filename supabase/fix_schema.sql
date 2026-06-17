ALTER TABLE public.transactions ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE public.transactions DROP CONSTRAINT must_have_different_buyer_seller;
ALTER TABLE public.transactions ADD CONSTRAINT must_have_different_buyer_seller CHECK (buyer_id IS NULL OR buyer_id != seller_id);
