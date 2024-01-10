/*
  Warnings:

  - You are about to drop the column `recipes` on the `ShoppingList` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShoppingList" DROP COLUMN "recipes",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "_RecipeToShoppingList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RecipeToShoppingList_AB_unique" ON "_RecipeToShoppingList"("A", "B");

-- CreateIndex
CREATE INDEX "_RecipeToShoppingList_B_index" ON "_RecipeToShoppingList"("B");

-- AddForeignKey
ALTER TABLE "_RecipeToShoppingList" ADD CONSTRAINT "_RecipeToShoppingList_A_fkey" FOREIGN KEY ("A") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecipeToShoppingList" ADD CONSTRAINT "_RecipeToShoppingList_B_fkey" FOREIGN KEY ("B") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
