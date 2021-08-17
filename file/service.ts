import { File, Prisma, PrismaClient } from "@prisma/client"
import { download, FakeAwsFile, getBucket, upload } from "../bucket"
import { CreateFileVersionInput } from "../fileVersion"

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: { name: true, directoryId: true, versions: true },
})

export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> &
  CreateFileVersionInput

export async function updateFileHistory(
  client: PrismaClient,
  id: File["id"],
  entry: Record<string, string | number | boolean>
): Promise<Prisma.JsonArray> {
  const file = await client.file.findUnique({
    where: { id },
    select: { history: true },
  })
  if (!file) {
    throw new Error("File not found")
  }
  const history =
    file.history &&
    typeof file.history === "object" &&
    Array.isArray(file.history)
      ? file.history
      : []
  const updatedHistory = [
    ...history,
    {
      ...entry,
      date: new Date().toString(),
    },
  ]
  return updatedHistory
}

export async function createFileRecord(
  client: PrismaClient,
  file: CreateFileInput
): Promise<{ file: File; url: string }> {
  const { name, directoryId, mimeType, size } = file
  const directory = directoryId
    ? await client.directory.findUnique({ where: { id: directoryId } })
    : null
  const ancestors = directory?.ancestors ?? []
  const data = {
    name,
    directoryId,
    history: [
      {
        action: "created",
        name,
        mimeType,
        size,
        ...(directory ? { directory: directory.name } : {}),
      },
    ],
    versions: {
      create: {
        name,
        mimeType,
        size,
        ancestors: [...ancestors, ...(directoryId ?? [])],
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
    include: { versions: { where: { deletedAt: null } } },
  })
}

export async function findFiles(
  client: PrismaClient,
  query: string
): Promise<File[] | null> {
  return await client.file.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: [{ name: "asc" }],
    include: { versions: { where: { deletedAt: null } } },
  })
}

export async function moveFile(
  client: PrismaClient,
  id: File["id"],
  directoryId: File["directoryId"]
): Promise<File> {
  const directory = await client.directory.findUnique({
    where: { id: directoryId },
  })
  if (!directory) {
    throw new Error("Invalid target Directory")
  }
  const updatedHistory = await updateFileHistory(client, id, {
    directory: directory.id,
  })
  const { ancestors } = directory
  return await client.file.update({
    where: { id },
    data: {
      directoryId,
      ancestors: [...ancestors, directoryId],
      history: updatedHistory,
    },
  })
}

export async function renameFile(
  client: PrismaClient,
  id: File["id"],
  name: File["name"]
): Promise<File> {
  const updatedHistory = await updateFileHistory(client, id, { name })
  const updatedFile = await client.file.update({
    where: { id },
    data: { name, history: updatedHistory },
  })
  return updatedFile
}

export async function deleteFile(
  client: PrismaClient,
  id: File["id"]
): Promise<boolean> {
  const updatedHistory = await updateFileHistory(client, id, { deleted: true })
  await client.$transaction([
    client.file.update({ where: { id }, data: { history: updatedHistory } }),
    client.file.delete({ where: { id } }),
  ])
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
