-- AlterTable
ALTER TABLE "Directory" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FileVersion" ADD COLUMN     "deletedAt" TIMESTAMP(3);
