import { GetObjectOutput, HeadObjectOutput } from "aws-sdk/clients/s3"
import { promises as fs } from "fs"
import { DateTime } from "luxon"
import { dirname, join } from "path"
import { FileBucket, SIGNED_URL_EXPIRES } from "./bucket"

// TODO: Actually set these
const rootDir = ""
const baseUrl = ""

type FakeAwsFile = Required<Pick<GetObjectOutput, "ContentType">> &
  Pick<GetObjectOutput, "ContentLength" | "LastModified"> & { Body: Buffer }

export function getLocalBucket(): FileBucket {
  return {
    getSignedUrl,
    headObject,
    moveObject,
  }
}

async function getObject(key: string): Promise<GetObjectOutput> {
  const rest = await headObject(key)
  const Body = await readFile(key)
  return { Body, ...rest }
}

async function headObject(key: string): Promise<HeadObjectOutput> {
  const path = getPath(key)
  try {
    await fs.stat(path)
  } catch (e) {
    throw new Error(e)
  }
  const raw = await readFile(key + ".info")
  const info = JSON.parse(raw.toString())
  info.LastModified = new Date(info.LastModified)

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
  await writeFile(`${key}.info`, JSON.stringify(info))
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

async function download(signed: string) {
  const key = validateSignedUrl("getObject", signed)
  return await getObject(key)
}

async function upload(signed: string, file: FakeAwsFile) {
  const key = validateSignedUrl("putObject", signed)
  await saveFile(key, {
    ContentLength: file.Body.byteLength,
    LastModified: new Date(),
    ...file,
  })
}

function validateSignedUrl(operation: string, url: string) {
  let raw
  try {
    raw = new URL(url).searchParams.get("signed")
  } catch (e) {
    raw = url
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(e)
  }
  if (DateTime.local() > DateTime.fromMillis(parsed.expires)) {
    throw new Error("url expired")
  }
  return parsed.key as string
}
