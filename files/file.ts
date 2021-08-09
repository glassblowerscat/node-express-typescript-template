import { File, PrismaClient } from "@prisma/client"
import { download, FakeAwsFile, getBucket, upload } from "../bucket"

export async function createFileRecord(
  client: PrismaClient,
  file: File
): Promise<File & { url: string }> {
  const fileData = await client.file.create({ data: file })
  // TODO: Do we need to manually update the directory
  // with this new file?
  const bucket = getBucket()
  if (bucket) {
    const url = await bucket.getSignedUrl("putObject", file.name)
    return {
      ...fileData,
      url,
    }
  } else {
    await client.file.delete({ where: { id: fileData.id } })
    throw new Error("Could not instantiate file bucket")
  }
}

export async function getFile(
  client: PrismaClient,
  id: File["id"]
): Promise<File> {
  const file = await client.file.findUnique({ where: { id } })
  if (file) return file
  throw new Error("File not found")
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
): Promise<void> {
  await client.file.delete({ where: { id } })
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
