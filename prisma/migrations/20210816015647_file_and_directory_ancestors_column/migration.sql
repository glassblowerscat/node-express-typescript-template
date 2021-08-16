-- AlterTable
ALTER TABLE "directories" ADD COLUMN     "ancestors" TEXT[];

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "ancestors" TEXT[];
