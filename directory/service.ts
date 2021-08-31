import { Directory, File, Prisma, PrismaClient } from "@prisma/client"
import { Pagination } from "../app"
import { deleteFile } from "../file"

export interface Sort {
  field: keyof Pick<File, "name" | "createdAt" | "updatedAt">
  direction?: "ASC" | "DESC"
}

export interface RawSort {
  field: "name" | "size" | "createdAt" | "updatedAt"
  direction?: "ASC" | "DESC"
}

export async function createDirectory(
  client: PrismaClient,
  name: Directory["name"],
  parentId: Directory["parentId"]
): Promise<Directory> {
  if (name === "root") {
    throw new Error("Directory name 'root' is reserved")
  }
  const parent = parentId
    ? await client.directory.findUnique({ where: { id: parentId } })
    : null
  const ancestors = parent?.ancestors ?? []
  const directory = await client.directory.create({
    data: {
      name,
      parentId,
      ancestors: [...ancestors, ...(parentId ? [parentId] : [])],
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

export interface DirectoryContentsResult {
  id: string
  name: string
  mimeType: string
  size: number
  key: string
  createdAt: Date
  updatedAt: Date
  type: "File" | "Directory"
}

type RawResult = Array<
  Omit<DirectoryContentsResult, "type"> & { type: "1" | "2" }
>

export async function getDirectoryContentsRaw(
  client: PrismaClient,
  id: Directory["id"],
  pagination?: Pagination,
  sort?: RawSort
): Promise<DirectoryContentsResult[]> {
  const { field = "name", direction = "ASC" } = sort ?? {}
  const { pageLength = 20, page = 1 } = pagination ?? {}

  const mainQuery = Prisma.sql`
    SELECT f.id, f.name, f.ancestors, f."mimeType", f.size, f.key, f."createdAt", f."updatedAt", '2' as type from
      (SELECT DISTINCT ON (files.id) * from files
        INNER JOIN (SELECT "fileId", "mimeType", size, key from file_versions) as fv
          ON fv."fileId" = files.id
        ORDER BY files.id) as f
    WHERE ${id} = ANY(ancestors)
      AND "deletedAt" IS NULL
    UNION ALL
    SELECT d.id, d.name, d.ancestors, '' as "mimeType", 0 as size, '' as key, d."createdAt", d."updatedAt", '1' as type FROM directories d
    WHERE ${id} = ANY(ancestors)
      AND "deletedAt" IS NULL`

  const paginationSql = Prisma.sql`
    LIMIT ${pageLength} OFFSET ${pageLength * (page - 1)}`

  const directionSql = direction === "DESC" ? Prisma.sql`DESC` : Prisma.empty

  const results =
    field === "name"
      ? await client.$queryRaw<RawResult>`
        ${mainQuery}
          ORDER BY type, name ${directionSql}
        ${paginationSql};
      `
      : field === "size"
      ? await client.$queryRaw<RawResult>`
        ${mainQuery}
        ORDER BY type, size, name ${directionSql}
        ${paginationSql};
      `
      : field === "createdAt"
      ? await client.$queryRaw<RawResult>`
        ${mainQuery}
        ORDER BY "createdAt" ${directionSql}
        ${paginationSql};
      `
      : field === "updatedAt"
      ? await client.$queryRaw<RawResult>`
        ${mainQuery}
        ORDER BY "updatedAt" ${directionSql}
        ${paginationSql};
      `
      : await client.$queryRaw<RawResult>`
        ${mainQuery}
        ORDER BY type, name ${directionSql}
        ${paginationSql};
      `

  return results.map((result) => ({
    ...result,
    type: result.type === "1" ? "Directory" : "File",
  }))
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
  if (!directory) {
    throw new Error("Directory not found")
  }
  function isFile(item: File | Directory): item is File {
    return Object.prototype.hasOwnProperty.call(item, "directoryId")
  }
  const { field, direction } = sort ?? {}
  const { pageLength = 20, page = 1 } = pagination ?? {}

  const [files, directories] = await client.$transaction([
    client.file.findMany({
      where: {
        ancestors: {
          has: id,
        },
      },
    }),
    client.directory.findMany({
      where: {
        ancestors: {
          has: id,
        },
      },
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
  const paginatedContents = contents.slice(
    (page - 1) * pageLength,
    (page - 1) * pageLength + pageLength
  )
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
  const thisDirectory = await client.directory.findUnique({ where: { id } })

  if (!thisDirectory) {
    throw new Error("Invalid Directory")
  }

  const destinationDirectory = await client.directory.findUnique({
    where: { id: directoryId },
  })

  if (!destinationDirectory || destinationDirectory.ancestors.includes(id)) {
    throw new Error("Invalid target Directory")
  }

  const oldAncestors = thisDirectory.ancestors
  const { ancestors } = destinationDirectory

  const childFilesOfThisDirectory = await client.file.findMany({
    where: {
      directoryId: thisDirectory.id ?? "",
    },
    select: { id: true, ancestors: true, history: true },
  })
  const descendentFilesOfThisDirectory = await client.file.findMany({
    where: {
      ancestors: {
        has: thisDirectory.id ?? "",
      },
    },
    select: { id: true, ancestors: true, history: true },
  })
  const descendentDirectoriesOfThisDirectory = await client.directory.findMany({
    where: {
      ancestors: {
        has: thisDirectory.id ?? "",
      },
    },
    select: { id: true, ancestors: true },
  })
  const descendentAncestorUpdates = [
    ...childFilesOfThisDirectory.map((file) => {
      const updatedAncestors = [
        ...ancestors,
        destinationDirectory.id,
        thisDirectory.id,
      ]
      return client.file.update({
        where: {
          id: file.id,
        },
        data: {
          ancestors: updatedAncestors,
          history: {
            ...(file.history &&
            typeof file.history === "object" &&
            Array.isArray(file.history)
              ? file.history
              : []),
            ancestors: JSON.stringify(updatedAncestors),
          },
        },
      })
    }),
    ...descendentFilesOfThisDirectory.map((file) => {
      const updatedAncestors = [
        ...new Set([
          ...file.ancestors.filter((a) => !oldAncestors.includes(a)),
          ...ancestors,
          destinationDirectory.id,
          thisDirectory.id,
        ]),
      ]
      return client.file.update({
        where: {
          id: file.id,
        },
        data: {
          ancestors: updatedAncestors,
          history: {
            ...(file.history &&
            typeof file.history === "object" &&
            Array.isArray(file.history)
              ? file.history
              : []),
            ancestors: JSON.stringify(updatedAncestors),
          },
        },
      })
    }),
    ...descendentDirectoriesOfThisDirectory.map((directory) => {
      return client.directory.update({
        where: {
          id: directory.id,
        },
        data: {
          ancestors: [
            ...new Set([
              ...directory.ancestors.filter((a) => !oldAncestors.includes(a)),
              ...ancestors,
              destinationDirectory.id,
              thisDirectory.id,
            ]),
          ],
        },
      })
    }),
  ]

  const ancestorUpdates = [
    ...descendentAncestorUpdates,
    // No history to update, so it can just have
    // new ancestors passed.
    client.directory.updateMany({
      where: {
        parentId: thisDirectory.id ?? "",
      },
      data: {
        ancestors: [...ancestors, destinationDirectory.id, thisDirectory.id],
      },
    }),
  ]

  await client.$transaction([
    ...ancestorUpdates,
    client.directory.update({
      where: { id: thisDirectory.id },
      data: {
        parentId: destinationDirectory.id,
        ancestors: [...ancestors, destinationDirectory.id],
      },
    }),
  ])

  // We already know this directory exists; let's just assert
  return (await client.directory.findUnique({
    where: { id: thisDirectory.id },
    include: { directories: true, files: true },
  })) as Directory
}

export async function renameDirectory(
  client: PrismaClient,
  id: Directory["id"],
  name: Directory["name"]
): Promise<Directory> {
  if (name.toLowerCase() === "root") {
    throw new Error("Directory name 'root' is reserved")
  }

  const directory = await client.directory.findUnique({ where: { id } })

  if (!directory) {
    throw new Error("Invalid Directory")
  }

  if (directory.name === "root") {
    throw new Error("Root directory may not be renamed")
  }

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
  await client.directory.deleteMany({
    where: {
      ancestors: {
        has: id,
      },
      deletedAt: null,
    },
  })
  const files = await client.file.findMany({
    where: {
      ancestors: {
        has: id,
      },
      deletedAt: null,
    },
    include: { versions: true },
  })
  for (const file of files) {
    await deleteFile(client, file.id)
  }
  await client.directory.delete({ where: { id } })
  return true
}
