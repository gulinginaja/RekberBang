-- Migration: 00005_privacy_evidence_retention
-- Description: Add OCR metadata and expiration columns to evidences table for privacy-first retention.

ALTER TABLE public.evidences
ADD COLUMN proof_hash TEXT,
ADD COLUMN nominal NUMERIC,
ADD COLUMN sender_name TEXT,
ADD COLUMN sender_account TEXT,
ADD COLUMN recipient_name TEXT,
ADD COLUMN recipient_account TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN transfer_date DATE,
ADD COLUMN transfer_time TIME,
ADD COLUMN verification_status TEXT,
ADD COLUMN verified_by UUID REFERENCES public.users(id),
ADD COLUMN verified_at TIMESTAMPTZ,
ADD COLUMN expires_at TIMESTAMPTZ;

-- Allow file_url to be null for deleted files
ALTER TABLE public.evidences ALTER COLUMN file_url DROP NOT NULL;
