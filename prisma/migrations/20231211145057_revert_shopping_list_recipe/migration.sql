/*
  Warnings:

  - You are about to drop the `_RecipeToShoppingList` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_RecipeToShoppingList" DROP CONSTRAINT "_RecipeToShoppingList_A_fkey";

-- DropForeignKey
ALTER TABLE "_RecipeToShoppingList" DROP CONSTRAINT "_RecipeToShoppingList_B_fkey";

-- AlterTable
ALTER TABLE "ShoppingList" ADD COLUMN     "recipes" JSONB[];

-- DropTable
DROP TABLE "_RecipeToShoppingList";
