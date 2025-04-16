/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Recipe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "difficulty",
DROP COLUMN "type",
ADD COLUMN     "cuisine" TEXT[],
ADD COLUMN     "isChildFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "typeOfDish" TEXT[],
ADD COLUMN     "typeOfMeal" TEXT[];
