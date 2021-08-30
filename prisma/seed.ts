import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import { join } from "path"
import { saveFile } from "../bucket/localBucket"
import { createDirectory } from "../directory"
import { createFileRecord } from "../file"
import { generateFileName, generateId } from "../util/generators"
import { getMimeTypeFromExtension } from "../util/parsers"

export async function seed(): Promise<void> {
  const seedFilesPath = `${__dirname}/../../seed-files`
  const client = new PrismaClient()
  try {
    const existingRootDirectory = await client.directory.findFirst({
      where: { name: "root" },
    })
    const rootDirectory =
      existingRootDirectory ??
      (await client.directory.create({ data: { name: "root" } }))

    /**
     * Let's create a couple child directories
     * and children of those child directories.
     * This will help us later when we're testing
     * operations where we modify whole directories
     * and want to make sure their descendents get
     * modified as we would expect.
     *
     * We'll make sure to copy some of our files
     * into each of these directories. To do this,
     * we'll just re-use some of the files, so there
     * will be multiple copies of some files, but
     * that's okay.
     */

    const subDir1 = await createDirectory(
      client,
      "Sub-Directory 1",
      rootDirectory.id
    )
    const subDir2 = await createDirectory(
      client,
      "Sub-Directory 2",
      rootDirectory.id
    )
    const subSubDir1 = await createDirectory(
      client,
      "Sub-Sub-Directory 1",
      subDir1.id
    )
    const subSubDir2 = await createDirectory(
      client,
      "Sub-Sub-Directory 2",
      subDir1.id
    )

    const filesDir = await fs.readdir(seedFilesPath)
    const files = filesDir.filter((file) => file !== ".DS_Store")
    for (const [index, file] of files.entries()) {
      const name = generateFileName()
      const key = await generateId()
      const mimeType = getMimeTypeFromExtension(file)
      const buffer = await fs.readFile(join(seedFilesPath, file))
      const size = buffer.byteLength
      await saveFile(key, {
        ContentLength: size,
        LastModified: new Date(),
        ContentType: mimeType,
        Body: buffer,
      })

      // At time of this comment, we have 114 files in our 'seed-files' folder
      // At least 21 per folder so we get a third page with pages of 10
      const directoryId =
        index < 21
          ? subSubDir2.id
          : index < 42
          ? subSubDir1.id
          : index < 63
          ? subDir2.id
          : index < 84
          ? subDir1.id
          : rootDirectory.id
      await createFileRecord(client, {
        name,
        key,
        directoryId,
        mimeType,
        size,
      })
    }
  } catch (error) {
    console.error(error)
  }
  await client.$disconnect()
}
