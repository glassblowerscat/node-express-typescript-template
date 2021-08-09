import { FileVersion, PrismaClient } from "@prisma/client"
import { getBucket } from "../bucket"

export async function createFileRecord(
  client: PrismaClient,
  fileVersion: FileVersion
): Promise<FileVersion & { url: string }> {
  const versionData = await client.fileVersion.create({ data: fileVersion })
  // TODO: Do we need to manually update the directory
  // with this new file?
  const bucket = getBucket()
  if (bucket) {
    const url = await bucket.getSignedUrl("putObject", fileVersion.fileName)
    return {
      ...versionData,
      url,
    }
  } else {
    await client.fileVersion.delete({ where: { id: versionData.id } })
    throw new Error("Could not instantiate file bucket")
  }
}

export async function getFileVersion(
  client: PrismaClient,
  id: FileVersion["id"]
): Promise<FileVersion> {
  const version = await client.fileVersion.findUnique({ where: { id } })
  if (version) return version
  throw new Error("File Version not found")
}

export async function renameFileVersion(
  client: PrismaClient,
  id: FileVersion["id"],
  fileName: FileVersion["fileName"]
): Promise<FileVersion> {
  const updatedFile = await client.fileVersion.update({
    where: { id },
    data: { fileName },
  })
  return updatedFile
}

export async function deleteFileVersion(
  client: PrismaClient,
  id: FileVersion["id"]
): Promise<void> {
  await client.fileVersion.delete({ where: { id } })
}
