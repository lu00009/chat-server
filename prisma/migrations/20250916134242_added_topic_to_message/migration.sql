-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "topicId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
