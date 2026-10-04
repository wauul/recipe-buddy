CREATE TABLE "MealMedia" (
 "kitchenId" TEXT NOT NULL REFERENCES "MealKitchen"("id") ON DELETE CASCADE,
 "occasionId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "photo" BYTEA NOT NULL,
 PRIMARY KEY ("kitchenId","occasionId")
);
