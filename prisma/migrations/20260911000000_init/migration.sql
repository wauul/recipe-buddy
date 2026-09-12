CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "hashedPassword" TEXT NOT NULL,
  "roastEnabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Recipe" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "altTitle" TEXT NOT NULL DEFAULT '', "servings" INTEGER NOT NULL,
  "vibe" TEXT NOT NULL DEFAULT 'cozy', "roastLine" TEXT NOT NULL DEFAULT '',
  "ingredients" JSONB NOT NULL, "steps" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Recipe_userId_createdAt_idx" ON "Recipe"("userId", "createdAt");
CREATE TABLE "CookedLog" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "recipeId" TEXT NOT NULL, "date" DATE NOT NULL,
  CONSTRAINT "CookedLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CookedLog_userId_recipeId_date_key" ON "CookedLog"("userId", "recipeId", "date");
CREATE INDEX "CookedLog_userId_date_idx" ON "CookedLog"("userId", "date");
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CookedLog" ADD CONSTRAINT "CookedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CookedLog" ADD CONSTRAINT "CookedLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "RateLimit" (
  "key" TEXT NOT NULL, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
