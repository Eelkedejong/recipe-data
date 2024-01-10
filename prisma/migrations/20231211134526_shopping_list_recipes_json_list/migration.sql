/*
  Warnings:

  - The `recipes` column on the `ShoppingList` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ShoppingList" DROP COLUMN "recipes",
ADD COLUMN     "recipes" JSONB[];
