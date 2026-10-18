-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "dietFlagsDerived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVegan" BOOLEAN NOT NULL DEFAULT false;
