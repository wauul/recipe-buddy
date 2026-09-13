CREATE TABLE "Friendship" (
  "id" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Friendship_distinct_users" CHECK ("userAId" < "userBId"),
  CONSTRAINT "Friendship_requester_is_member" CHECK ("requesterId" IN ("userAId", "userBId"))
);
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");
CREATE INDEX "Friendship_userBId_idx" ON "Friendship"("userBId");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RecipeShare" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "friendshipId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeShare_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecipeShare_recipeId_recipientId_key" ON "RecipeShare"("recipeId", "recipientId");
CREATE INDEX "RecipeShare_recipientId_createdAt_idx" ON "RecipeShare"("recipientId", "createdAt");
CREATE INDEX "RecipeShare_friendshipId_idx" ON "RecipeShare"("friendshipId");
ALTER TABLE "RecipeShare" ADD CONSTRAINT "RecipeShare_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeShare" ADD CONSTRAINT "RecipeShare_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeShare" ADD CONSTRAINT "RecipeShare_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "Friendship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
