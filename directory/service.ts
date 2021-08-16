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
  const parent = parentId
    ? await client.directory.findUnique({ where: { id: parentId } })
    : null
  const ancestors = parent?.ancestors ?? []
  const directory = await client.directory.create({
    data: {
      name,
      parentId,
      ancestors: [...ancestors, ...(parentId ?? [])],
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
        INNER JOIN (SELECT * FROM files
            INNER JOIN file_versions
              ON file_versions.fileID = files.id
                AND file_versions.deletedAt = NULL)
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
    const [files, directories] = await client.$transaction([
      client.directory
        .findUnique({
          where: { id },
        })
        .files({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        }),
      client.directory
        .findUnique({
          where: { id },
        })
        .directories({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        }),
    ])
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

export async function countDirectoryChildren(
  client: PrismaClient,
  id: Directory["id"]
): Promise<number> {
  const [files, directories] = await client.$transaction([
    client.file.count({
      where: {
        ancestors: {
          has: id,
        },
      },
    }),
    client.directory.count({
      where: {
        ancestors: {
          has: id,
        },
      },
    }),
  ])
  return directories + files
}

export async function getDirectorySize(
  client: PrismaClient,
  id: Directory["id"]
): Promise<number | null> {
  const {
    _sum: { size },
  } = await client.fileVersion.aggregate({
    _sum: {
      size: true,
    },
    where: {
      file: {
        ancestors: {
          has: id,
        },
      },
    },
  })
  return size
}

export async function moveDirectory(
  client: PrismaClient,
  id: Directory["id"],
  directoryId: Directory["id"]
): Promise<Directory> {
  const directory = await client.directory.findUnique({
    where: { id: directoryId },
  })
  if (!directory) {
    throw new Error("Invalid target Directory")
  }
  const { ancestors } = directory
  return await client.directory.update({
    where: { id },
    data: {
      parentId: directoryId,
      ancestors: [...ancestors, directoryId],
    },
  })
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
