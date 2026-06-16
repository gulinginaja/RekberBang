-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE public.fee_split_mode AS ENUM ('BUYER_PAYS_ALL', 'SELLER_PAYS_ALL', 'SPLIT_50_50', 'CUSTOM');
CREATE TYPE public.transaction_status AS ENUM (
    'CREATED', 'WAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'FUNDED', 
    'DELIVERING', 'DELIVERED', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED'
);
CREATE TYPE public.dispute_status AS ENUM ('OPEN', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'ESCALATED');
CREATE TYPE public.evidence_purpose AS ENUM ('PAYMENT_PROOF', 'DELIVERY_PROOF', 'DISPUTE_EVIDENCE');

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    photo_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    trust_score INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES public.users(id),
    seller_id UUID REFERENCES public.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fee_split_mode public.fee_split_mode NOT NULL DEFAULT 'SPLIT_50_50',
    status public.transaction_status DEFAULT 'CREATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT must_have_different_buyer_seller CHECK (buyer_id IS NULL OR buyer_id != seller_id)
);

-- Disputes
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) NOT NULL,
    raised_by UUID REFERENCES public.users(id) NOT NULL,
    reason TEXT NOT NULL,
    status public.dispute_status DEFAULT 'OPEN',
    admin_decision TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Evidence
CREATE TABLE public.evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) NOT NULL,
    file_url TEXT NOT NULL,
    purpose public.evidence_purpose NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) NOT NULL,
    actor_id UUID REFERENCES public.users(id) NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_disputes_transaction ON public.disputes(transaction_id);
CREATE INDEX idx_evidences_transaction ON public.evidences(transaction_id);
CREATE INDEX idx_audit_logs_transaction ON public.audit_logs(transaction_id);

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- transactions policies
CREATE POLICY "View transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Update transactions (Users)" ON public.transactions FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id) WITH CHECK (status NOT IN ('FUNDED', 'RELEASED', 'REFUNDED'));
CREATE POLICY "Update transactions (Admins)" ON public.transactions FOR UPDATE USING (public.is_admin());

-- disputes policies
CREATE POLICY "View disputes" ON public.disputes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid()))
    OR public.is_admin()
);
CREATE POLICY "Insert disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "Update disputes" ON public.disputes FOR UPDATE USING (public.is_admin());

-- evidences policies
CREATE POLICY "View evidences" ON public.evidences FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid()))
    OR public.is_admin()
);
CREATE POLICY "Insert evidences" ON public.evidences FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
-- Evidences are immutable, no update/delete policies

-- audit_logs policies
CREATE POLICY "View audit logs" ON public.audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid()))
    OR public.is_admin()
);
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = actor_id OR public.is_admin());
-- Audit logs are immutable, no update/delete policies

-- Storage Bucket Setup (rekber_evidence)
-- Note: This assumes the bucket is created via dashboard or another migration script, 
-- but we define the policies here.
INSERT INTO storage.buckets (id, name, public) VALUES ('rekber_evidence', 'rekber_evidence', false) ON CONFLICT DO NOTHING;

CREATE POLICY "View evidence bucket" ON storage.objects FOR SELECT USING (bucket_id = 'rekber_evidence');
CREATE POLICY "Upload to evidence bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rekber_evidence' AND auth.role() = 'authenticated');

-- Seed Data
INSERT INTO public.users (id, telegram_id, username, is_admin) VALUES 
('00000000-0000-0000-0000-000000000001', 1638657267, 'admin_rekber', true),
('00000000-0000-0000-0000-000000000002', 222222222, 'buyer_user', false),
('00000000-0000-0000-0000-000000000003', 333333333, 'seller_user', false)
ON CONFLICT (telegram_id) DO NOTHING;

INSERT INTO public.transactions (id, buyer_id, seller_id, title, description, amount, status) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Test Escrow #1', 'Buying a digital service', 500000.00, 'WAITING_PAYMENT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (transaction_id, actor_id, action, metadata) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'CREATE_TRANSACTION', '{"ip": "127.0.0.1"}');
