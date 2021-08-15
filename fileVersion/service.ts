import { File, FileVersion, Prisma, PrismaClient } from "@prisma/client"
import { Pagination } from "../app"
import { getBucket } from "../bucket"

const fileVersionInputFields = Prisma.validator<Prisma.FileVersionArgs>()({
  select: { fileId: true, name: true, mimeType: true, size: true },
})

export type CreateFileVersionInput = Prisma.FileVersionGetPayload<
  typeof fileVersionInputFields
>

export async function createFileVersionRecord(
  client: PrismaClient,
  fileVersion: CreateFileVersionInput
): Promise<FileVersion & { url: string }> {
  const versionData = await client.fileVersion.create({ data: fileVersion })
  // TODO: Do we need to manually update the directory
  // with this new file?
  const bucket = getBucket()
  if (bucket) {
    const url = await bucket.getSignedUrl("putObject", fileVersion.name)
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
): Promise<FileVersion | null> {
  return await client.fileVersion.findUnique({ where: { id } })
}

export async function getFileVersions(
  client: PrismaClient,
  fileId: File["id"],
  pagination?: Pagination
): Promise<FileVersion[]> {
  return await client.fileVersion.findMany({
    ...(pagination ? { skip: pagination.page * pagination.pageLength } : {}),
    ...(pagination ? { take: pagination.pageLength } : {}),
    where: { fileId, deletedAt: null },
  })
}

export async function renameFileVersion(
  client: PrismaClient,
  id: FileVersion["id"],
  name: FileVersion["name"]
): Promise<FileVersion> {
  return await client.fileVersion.update({
    where: { id },
    data: { name },
  })
}

export async function deleteFileVersion(
  client: PrismaClient,
  id: FileVersion["id"]
): Promise<boolean> {
  await client.fileVersion.delete({ where: { id } })
  return true
}
