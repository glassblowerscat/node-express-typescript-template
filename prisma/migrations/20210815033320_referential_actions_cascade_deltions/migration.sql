-- DropForeignKey
ALTER TABLE "Directory" DROP CONSTRAINT "Directory_parentId_fkey";

-- AddForeignKey
ALTER TABLE "Directory" ADD FOREIGN KEY ("parentId") REFERENCES "Directory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
