-- Migration: Fix Dispute Center RLS
-- Replacing deleted is_admin column check with the public.is_admin() function

ALTER TABLE public.dispute_messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dispute messages viewable by participants and admins" ON public.dispute_messages;
CREATE POLICY "Dispute messages viewable by participants and admins" ON public.dispute_messages
    FOR SELECT USING (
        (EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = dispute_messages.transaction_id 
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        ) AND is_internal_note = false)
        OR 
        public.is_admin()
    );

DROP POLICY IF EXISTS "Participants and admins can insert messages" ON public.dispute_messages;
CREATE POLICY "Participants and admins can insert messages" ON public.dispute_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_id 
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        )
        OR 
        public.is_admin()
    );

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
