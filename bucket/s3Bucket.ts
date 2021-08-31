import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  /* HeadObjectCommand, */
  /* HeadObjectOutput, */
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl as getSignedS3Url } from "@aws-sdk/s3-request-presigner"
import { FakeAwsFile, FileBucket, SIGNED_URL_EXPIRES } from "./bucket"

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "" })

export function getS3Bucket(bucketId: string): FileBucket {
  return {
    getSignedUrl: (operation, key) => getSignedUrl(operation, key, bucketId),
    // headObject: (key) => headObject(key, bucketId),
    saveFile: (key, file) => uploadFile(key, file, bucketId),
    deleteObject: (key) => deleteObject(key, bucketId),
  }
}

function getSignedUrl(operation: "get" | "put", key: string, bucketId: string) {
  const Command = operation === "get" ? GetObjectCommand : PutObjectCommand
  return getSignedS3Url(
    s3,
    new Command({
      Bucket: bucketId,
      Key: key,
    }),
    { expiresIn: SIGNED_URL_EXPIRES.as("seconds") }
  )
}

// async function headObject(
//   key: string,
//   bucketId: string
// ): Promise<HeadObjectOutput> {
//   return await s3.send(
//     new HeadObjectCommand({
//       Bucket: bucketId,
//       Key: key,
//     })
//   )
// }

async function uploadFile(
  key: string,
  file: FakeAwsFile,
  bucketId: string
): Promise<string> {
  const { Body, ..._ } = file
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketId,
      Key: key,
      Body,
    })
  )
  const url = await getSignedUrl("get", key, bucketId)
  return url
}

async function deleteObject(key: string, bucketId: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketId,
      Key: key,
    })
  )
}
