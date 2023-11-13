/*
  Warnings:

  - You are about to drop the column `carb` on the `Recipe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "carb",
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "type" TEXT,
ALTER COLUMN "time" DROP NOT NULL;
