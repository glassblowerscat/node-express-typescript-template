import { Directory, File, PrismaClient } from "@prisma/client"

export interface Pagination {
  pageLength: number
  page: number
}

export interface Sort {
  field: keyof Pick<File, "name" | "createdAt" | "updatedAt">
  direction?: "ASC" | "DESC"
}

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
): Promise<Directory & { directories: Directory[] } & { files: File[] }> {
  const directory = await client.directory.findUnique({
    where: { id },
    include: { directories: true, files: true },
  })
  if (directory) return directory
  throw new Error("Directory not found")
}

export async function getDirectoryContents(
  client: PrismaClient,
  id: Directory["id"],
  pagination?: Pagination,
  sort?: Sort
): Promise<Directory & { directories: Directory[] } & { files: File[] }> {
  const directory = await client.directory.findUnique({
    where: { id },
  })
  function isFile(item: File | Directory): item is File {
    return Object.prototype.hasOwnProperty.call(item, "directoryId")
  }
  if (directory) {
    const files = await client.file.findMany({
      where: { directoryId: id, deletedAt: null },
      orderBy: { name: "asc" },
    })
    const directories = await client.directory.findMany({
      where: { parentId: id, deletedAt: null },
      orderBy: { name: "asc" },
    })
    const contents =
      !sort || sort.field === "name"
        ? [...files, ...directories].sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
          })
        : // If we're sorting by anything other than name,
          // we'll put all directories first.
          [
            ...directories.sort((a, b) => {
              return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            }),
            ...files.sort((a, b) => {
              const { field, direction } = sort
              return a[field] > b[field]
                ? direction === "ASC"
                  ? 1
                  : -1
                : a[field] < b[field]
                ? direction === "ASC"
                  ? -1
                  : 1
                : 0
            }),
          ]
    const paginatedContents = pagination
      ? contents.slice(pagination.page - 1, pagination.pageLength)
      : contents
    const paginatedFiles = paginatedContents.filter((item) =>
      isFile(item)
    ) as File[]
    const paginatedDirectories = paginatedContents.filter(
      (item) => !isFile(item)
    ) as Directory[]
    return {
      ...directory,
      files: paginatedFiles,
      directories: paginatedDirectories,
    }
  } else {
    throw new Error("Directory not found")
  }
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
): Promise<boolean> {
  await client.directory.delete({ where: { id } })
  return true
}
