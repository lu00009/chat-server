-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "notificationSettings" JSONB NOT NULL DEFAULT '{}';
