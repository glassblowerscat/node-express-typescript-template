-- CreateEnum
CREATE TYPE "FileNodeType" AS ENUM ('DIRECTORY', 'FILE', 'FILE_VERSION');

-- CreateTable
CREATE TABLE "FileNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FileNodeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);
