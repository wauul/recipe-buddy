CREATE TABLE "RecipeTake" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'other',
  "change" TEXT NOT NULL,
  "ingredient" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeTake_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecipeComment" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "takeId" TEXT,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecipeTake_recipeId_createdAt_idx" ON "RecipeTake"("recipeId", "createdAt");
CREATE INDEX "RecipeTake_authorId_idx" ON "RecipeTake"("authorId");
CREATE INDEX "RecipeComment_recipeId_createdAt_idx" ON "RecipeComment"("recipeId", "createdAt");
CREATE INDEX "RecipeComment_takeId_idx" ON "RecipeComment"("takeId");
CREATE INDEX "RecipeComment_authorId_idx" ON "RecipeComment"("authorId");
ALTER TABLE "RecipeTake" ADD CONSTRAINT "RecipeTake_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeTake" ADD CONSTRAINT "RecipeTake_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeComment" ADD CONSTRAINT "RecipeComment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeComment" ADD CONSTRAINT "RecipeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeComment" ADD CONSTRAINT "RecipeComment_takeId_fkey" FOREIGN KEY ("takeId") REFERENCES "RecipeTake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
