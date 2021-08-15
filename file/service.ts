import { File, Prisma, PrismaClient } from "@prisma/client"
import { download, FakeAwsFile, getBucket, upload } from "../bucket"
import { CreateFileVersionInput } from "../fileVersion"

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: { name: true, directoryId: true, versions: true },
})

export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> &
  CreateFileVersionInput

export async function createFileRecord(
  client: PrismaClient,
  file: CreateFileInput
): Promise<{ file: File; url: string }> {
  const { name, directoryId, mimeType, size } = file
  const data = {
    name,
    directoryId,
    versions: {
      create: {
        fileName: name,
        mimeType,
        size,
      },
    },
  }
  const fileData = await client.file.create({ data })
  const bucket = getBucket()
  const url = await bucket.getSignedUrl("putObject", name)
  return { file: fileData, url }
}

export async function getFile(
  client: PrismaClient,
  id: File["id"]
): Promise<File | null> {
  return await client.file.findUnique({
    where: { id },
    include: { versions: true },
  })
}

export async function renameFile(
  client: PrismaClient,
  id: File["id"],
  name: File["name"]
): Promise<File> {
  const updatedFile = await client.file.update({
    where: { id },
    data: { name },
  })
  return updatedFile
}

export async function deleteFile(
  client: PrismaClient,
  id: File["id"]
): Promise<boolean> {
  await client.file.delete({ where: { id } })
  return true
}

export async function downloadLocalFile(
  signedUrl: string
): Promise<FakeAwsFile> {
  return await download(signedUrl)
}

export async function uploadLocalFile(
  signedUrl: string,
  file: FakeAwsFile
): Promise<void> {
  await upload(signedUrl, file)
}
