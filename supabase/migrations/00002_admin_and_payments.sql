-- Migration: Admin Roles, Payments, and QRIS Management

-- 1. Update Users Table (Switch from boolean is_admin to role enum)
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');

-- Add role column
ALTER TABLE public.users ADD COLUMN role public.user_role DEFAULT 'user';

-- Migrate existing is_admin data
UPDATE public.users SET role = 'admin' WHERE is_admin = true;

-- Drop is_admin column
ALTER TABLE public.users DROP COLUMN is_admin;

-- Update the is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper for super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Payment Methods Table
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View active payment methods" ON public.payment_methods FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Super Admins can manage payment methods" ON public.payment_methods FOR ALL USING (public.is_super_admin());

-- 3. QRIS Settings Table
CREATE TABLE public.qris_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.qris_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View active qris" ON public.qris_settings FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Super Admins can manage qris" ON public.qris_settings FOR ALL USING (public.is_super_admin());

-- 4. QRIS Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('qris_images', 'qris_images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read qris bucket" ON storage.objects FOR SELECT USING (bucket_id = 'qris_images');
CREATE POLICY "Super Admins manage qris bucket" ON storage.objects FOR ALL USING (bucket_id = 'qris_images' AND public.is_super_admin());
