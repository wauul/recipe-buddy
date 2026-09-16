ALTER TABLE "User" ADD COLUMN "username" TEXT NOT NULL DEFAULT '';
UPDATE "User" SET "username" = split_part("email", '@', 1);
