import { Directory, File, PrismaClient } from "@prisma/client"
import { Pagination } from "../app"

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
): Promise<
  (Directory & { directories: Directory[] } & { files: File[] }) | null
> {
  return client.directory.findUnique({
    where: { id },
    include: { directories: true, files: true },
  })
}

export async function findDirectories(
  client: PrismaClient,
  query: string
): Promise<Directory[]> {
  return await client.directory.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: [{ name: "asc" }],
  })
}

export async function getDirectoryContentsRaw(
  client: PrismaClient,
  id: Directory["id"],
  pagination?: Pagination,
  sort?: Sort
): Promise<Directory> {
  return await client.$queryRaw<Directory>`
    SELECT directories.id, directories.name, files.id, files.name, files.createdAt, files.updatedAt FROM
      (SELECT * FROM directories WHERE id = ${id}
        INNER JOIN (SELECT * FROM directories) AS subd
          ON subd.directoryId = directories.id
            AND subd.deletedAt = NULL
        INNER JOIN files
          ON files.directoryId = directories.id
            AND files.deletedAt = NULL
      )
    ORDER BY ${
      !sort || sort.field === "name"
        ? `subd.name, f.name`
        : `subd.${sort.field}, f.${sort.field}`
    } ${sort?.direction ?? "ASC"}
    ${
      pagination
        ? `LIMIT ${pagination.pageLength} OFFSET ${
            pagination.pageLength * pagination.page - 1
          }`
        : ""
    }
  `
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
    const { field, direction } = sort ?? {}
    const { pageLength = 20, page = 1 } = pagination ?? {}
    const files = await client.file.findMany({
      where: { directoryId: id, deletedAt: null },
      orderBy: { name: "asc" },
    })
    const directories = await client.directory.findMany({
      where: { parentId: id, deletedAt: null },
      orderBy: { name: "asc" },
    })
    const contents =
      !field || field === "name"
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
    const paginatedContents = contents.slice(page - 1, pageLength)
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
