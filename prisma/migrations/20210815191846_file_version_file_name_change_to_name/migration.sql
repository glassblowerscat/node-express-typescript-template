/*
  Warnings:

  - You are about to drop the column `fileName` on the `file_versions` table. All the data in the column will be lost.
  - Added the required column `name` to the `file_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "file_versions" DROP COLUMN "fileName",
ADD COLUMN     "name" TEXT NOT NULL;
