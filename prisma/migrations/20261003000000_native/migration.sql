-- CreateTable
CREATE TABLE "NativeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "NativeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NativeRefreshToken" (
    "hash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "NativeRefreshToken_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "NativeAuthAttempt" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "redirect" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "codeHash" TEXT,
    "userId" TEXT,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "NativeAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendInvite" (
    "hash" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "redeemedBy" TEXT,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "FriendInvite_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "NativeScan" (
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "result" JSONB,

    CONSTRAINT "NativeScan_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "NativeSession_userId_idx" ON "NativeSession"("userId");

-- CreateIndex
CREATE INDEX "NativeRefreshToken_sessionId_idx" ON "NativeRefreshToken"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "NativeAuthAttempt_codeHash_key" ON "NativeAuthAttempt"("codeHash");

-- CreateIndex
CREATE INDEX "FriendInvite_inviterId_idx" ON "FriendInvite"("inviterId");

-- AddForeignKey
ALTER TABLE "NativeSession" ADD CONSTRAINT "NativeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NativeRefreshToken" ADD CONSTRAINT "NativeRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "NativeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendInvite" ADD CONSTRAINT "FriendInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
