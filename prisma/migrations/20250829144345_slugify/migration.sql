/*
Warnings:

You are about to drop the Role table. If the table is not empty, all the data it contains will be lost.

A unique constraint covering the columns [slug] on the table Group will be added. If there are existing duplicate values, this will fail.

A unique constraint covering the columns [inviteCode] on the table Group will be added. If there are existing duplicate values, this will fail.

Added the required column inviteCode to the Group table without a default value. This is not possible if the table is not empty.

Added the required column slug to the Group table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: First, add the new columns as nullable to allow the table to be altered.
ALTER TABLE "public"."Group" ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "slug" TEXT;

-- Update the existing rows with unique values before making the columns non-nullable.
-- We use the existing unique 'id' to create unique values for slug and inviteCode.
UPDATE "public"."Group" SET "inviteCode" = "id";
UPDATE "public"."Group" SET "slug" = 'temp-' || "id";

-- AlterTable: Now, set the new columns to be NOT NULL since all rows now have a unique value.
ALTER TABLE "public"."Group" ALTER COLUMN "inviteCode" SET NOT NULL;
ALTER TABLE "public"."Group" ALTER COLUMN "slug" SET NOT NULL;

-- DropTable
DROP TABLE "public"."Role";

-- CreateIndex: Now add the unique constraints, as all rows have a unique value.
CREATE UNIQUE INDEX "Group_slug_key" ON "public"."Group"("slug");
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "public"."Group"("inviteCode");