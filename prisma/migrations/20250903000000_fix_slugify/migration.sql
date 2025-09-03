-- This migration fixes any potential issues with slug and inviteCode columns
-- For any NULL values in slug or inviteCode, generate valid values

-- First, update any rows where slug is NULL
UPDATE "public"."Group"
SET "slug" = 'group-' || "id"
WHERE "slug" IS NULL;

-- Then, update any rows where inviteCode is NULL
UPDATE "public"."Group"
SET "inviteCode" = 'INV-' || UPPER(SUBSTRING(REPLACE(CAST("id" AS VARCHAR), '-', ''), 1, 8))
WHERE "inviteCode" IS NULL;

-- Ensure the constraints exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Group_slug_key') THEN
        ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_slug_key" UNIQUE ("slug");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Group_inviteCode_key') THEN
        ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_inviteCode_key" UNIQUE ("inviteCode");
    END IF;
END $$;
