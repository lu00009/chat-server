-- CreateTable
CREATE TABLE "public"."MessageHidden" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageHidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageHidden_messageId_idx" ON "public"."MessageHidden"("messageId");

-- CreateIndex
CREATE INDEX "MessageHidden_userId_idx" ON "public"."MessageHidden"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageHidden_userId_messageId_key" ON "public"."MessageHidden"("userId", "messageId");

-- AddForeignKey
ALTER TABLE "public"."MessageHidden" ADD CONSTRAINT "MessageHidden_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageHidden" ADD CONSTRAINT "MessageHidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
