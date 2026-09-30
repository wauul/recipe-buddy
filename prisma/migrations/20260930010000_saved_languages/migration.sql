ALTER TABLE "Recipe" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "ContentTranslation" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "ContentTranslation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ContentTranslation_userId_idx" ON "ContentTranslation"("userId");
