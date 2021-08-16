import { promises as fs } from "fs"
import { DateTime } from "luxon"
import { dirname, join } from "path"
import { FakeAwsFile, FileBucket, SIGNED_URL_EXPIRES } from "./bucket"

const rootDir = ".files"
const baseUrl = `http://localhost:${process.env.LOCAL_PORT ?? 4000}/file`

export function getLocalBucket(): FileBucket {
  return {
    getSignedUrl,
    headObject,
    moveObject,
    saveFile,
  }
}

async function headObject(key: string): Promise<FakeAwsFile> {
  const path = getPath(key)
  try {
    await fs.stat(path)
  } catch (e) {
    throw new Error(e)
  }
  const raw = await readFile(key + ".info")
  const parsedInfo = JSON.parse(raw.toString()) as FakeAwsFile
  const info = {
    ...parsedInfo,
    ...(parsedInfo.LastModified
      ? { LastModified: new Date(parsedInfo.LastModified) }
      : {}),
  }
  return info
}

async function copyObject(oldKey: string, newKey: string) {
  await fs.copyFile(getPath(oldKey), getPath(newKey))
  await fs.copyFile(getPath(oldKey) + ".info", getPath(newKey) + ".info")
}

async function deleteObject(key: string) {
  await fs.unlink(getPath(key))
  await fs.unlink(getPath(key) + ".info")
}

async function readFile(key: string) {
  return await fs.readFile(getPath(key))
}

async function saveFile(key: string, file: FakeAwsFile) {
  const { Body, ...info } = file
  await writeFile(key, Body)
  await writeFile(
    `${key}.info`,
    JSON.stringify({
      ...info,
      ContentLength: Body.byteLength,
      LastModified: new Date(),
    })
  )
  const url = await getSignedUrl("getObject", key)
  return url
}

const fsWrite = fs.writeFile
async function writeFile(key: string, data: Parameters<typeof fsWrite>[1]) {
  const path = getPath(key)
  await fs.mkdir(dirname(path), {
    recursive: true,
  })
  await fs.writeFile(getPath(key), data)
}

function getPath(key: string) {
  return join(rootDir, key)
}

async function moveObject(oldKey: string, newKey: string) {
  await copyObject(oldKey, newKey)
  await deleteObject(oldKey)
}

function getSignedUrl(operation: string, key: string) {
  const signed = JSON.stringify({
    operation,
    key,
    expires: DateTime.local().plus(SIGNED_URL_EXPIRES).toMillis(),
  })
  const url = new URL(baseUrl)
  url.searchParams.set("signed", signed)
  return Promise.resolve(url.toString())
}

async function getObject(key: string): Promise<FakeAwsFile> {
  const rest = await headObject(key)
  const Body = await readFile(key)
  return { ...rest, Body }
}

export async function download(signedUrl: string): Promise<FakeAwsFile> {
  const key = validateSignedUrl("getObject", signedUrl)
  return await getObject(key)
}

export async function upload(signed: string, file: FakeAwsFile): Promise<void> {
  const key = validateSignedUrl("putObject", signed)
  await saveFile(key, {
    ContentLength: file.Body.byteLength,
    LastModified: new Date(),
    ...file,
  })
}

function validateSignedUrl(operation: string, url: string) {
  const searchParams = new URL(url).searchParams
  const rawSigned = searchParams.get("signed") ?? url
  try {
    const signed = JSON.parse(rawSigned) as {
      operation: string
      key: string
      expires: number
    }
    if (signed.operation !== operation) {
      throw new Error("Incorrect operation")
    }
    if (DateTime.local() > DateTime.fromMillis(signed.expires)) {
      throw new Error("URL expired")
    }
    return signed.key
  } catch (error) {
    throw new Error(error)
  }
}
