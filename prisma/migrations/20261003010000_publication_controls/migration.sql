ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '', ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
-- Existing sessions must sign in again before a passwordless deletion.
ALTER TABLE "NativeSession" ADD COLUMN "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01';
ALTER TABLE "NativeSession" ALTER COLUMN "authenticatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NativeScan" ADD COLUMN "userId" TEXT;
ALTER TABLE "NativeScan" ADD CONSTRAINT "NativeScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "NativeScan_userId_idx" ON "NativeScan"("userId");
CREATE TABLE "UserBlock" ("blockerId" TEXT NOT NULL, "blockedId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId", "blockedId"));
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");
CREATE TABLE "ContentReport" ("id" TEXT NOT NULL, "reporterId" TEXT NOT NULL, "recipeId" TEXT, "reportedUserId" TEXT, "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id"));
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");
CREATE INDEX "ContentReport_reporterId_idx" ON "ContentReport"("reporterId");
