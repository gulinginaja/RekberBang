-- Migration: Dispute Messages and Partial Settlement

-- 1. Add partial settlement fields to disputes
ALTER TABLE public.disputes ADD COLUMN settlement_seller_amount BIGINT DEFAULT 0;
ALTER TABLE public.disputes ADD COLUMN settlement_buyer_amount BIGINT DEFAULT 0;

-- 2. Update transaction status constraint to allow RESOLVED_PARTIAL
ALTER TABLE public.transactions DROP CONSTRAINT transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('CREATED', 'WAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'FUNDED', 'DELIVERING', 'DELIVERED', 'DISPUTED', 'RELEASED', 'REFUNDED', 'RESOLVED_PARTIAL', 'CANCELED'));

-- 3. Create dispute_messages table
CREATE TABLE public.dispute_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID REFERENCES public.transactions(id) NOT NULL,
    sender_id UUID REFERENCES public.users(id) NOT NULL,
    message TEXT,
    attachment_url TEXT,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS for dispute_messages
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute messages viewable by participants and admins" ON public.dispute_messages
    FOR SELECT USING (
        (EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = dispute_messages.transaction_id 
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        ) AND is_internal_note = false)
        OR 
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
    );

CREATE POLICY "Participants and admins can insert messages" ON public.dispute_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_id 
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        )
        OR 
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
    );
