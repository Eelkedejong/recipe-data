/*
  Warnings:

  - You are about to drop the column `recipeList` on the `ShoppingList` table. All the data in the column will be lost.
  - Added the required column `recipes` to the `ShoppingList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShoppingList" DROP COLUMN "recipeList",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "items" TEXT[],
ADD COLUMN     "recipes" JSONB NOT NULL,
ADD COLUMN     "tags" TEXT[];
