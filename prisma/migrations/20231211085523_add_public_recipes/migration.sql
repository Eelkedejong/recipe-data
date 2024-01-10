/*
  Warnings:

  - The primary key for the `ShoppingList` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `ShoppingList` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ShoppingList` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `ShoppingList` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ShoppingList` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `ShoppingList` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[belongsToId]` on the table `ShoppingList` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ShoppingList_id_belongsToId_key";

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "ShoppingList" DROP CONSTRAINT "ShoppingList_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "tags";

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_belongsToId_key" ON "ShoppingList"("belongsToId");
