/*
  Warnings:

  - The `tags` column on the `Recipe` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "tags",
ADD COLUMN     "tags" TEXT[];
