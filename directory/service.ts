import { Directory, File, PrismaClient } from "@prisma/client"
import { deleteFile } from "../file/service"

export async function createDirectory(
  client: PrismaClient,
  name: Directory["name"],
  parentId: Directory["parentId"]
): Promise<Directory> {
  const directory = await client.directory.create({
    data: {
      name,
      parentId,
    },
  })
  return directory
}

export async function getDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<Directory & { Directory: Directory[] } & { File: File[] }> {
  const directory = await client.directory.findUnique({
    where: { id },
    include: { Directory: true, File: true },
  })
  if (directory) return directory
  throw new Error("Directory not found")
}

export async function renameDirectory(
  client: PrismaClient,
  id: Directory["id"],
  name: Directory["name"]
): Promise<Directory> {
  return await client.directory.update({
    where: { id },
    data: {
      name,
    },
  })
}

export async function deleteDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<void> {
  const directory = await client.directory.findUnique({
    where: { id },
    include: { Directory: true, File: true },
  })
  if (directory) {
    const { Directory: directories, File: files } = directory
    for (const file of files) {
      await deleteFile(client, file.id)
    }
    for (const dir of directories) {
      await deleteDirectory(client, dir.id)
    }
  } else {
    throw new Error("Directory not found")
  }
}
