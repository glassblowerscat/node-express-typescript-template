/*
  Warnings:

  - Added the required column `updatedAt` to the `Directory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FileVersion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Directory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FileVersion" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
