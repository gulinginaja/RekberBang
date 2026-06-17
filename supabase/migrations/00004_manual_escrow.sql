-- Add PENDING_ADMIN_APPROVAL to transaction_status enum
-- We must handle the possibility that it already exists if running this multiple times
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_status' AND e.enumlabel = 'PENDING_ADMIN_APPROVAL') THEN
        ALTER TYPE transaction_status ADD VALUE 'PENDING_ADMIN_APPROVAL' BEFORE 'CREATED';
    END IF;
END
$$;
