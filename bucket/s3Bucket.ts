import { S3 } from "aws-sdk"
import { HeadObjectOutput } from "aws-sdk/clients/s3"
import { FakeAwsFile, FileBucket, SIGNED_URL_EXPIRES } from "./bucket"

const s3 = new S3()

export function getS3Bucket(bucketId: string): FileBucket {
  return {
    getSignedUrl: (operation, key) => getSignedUrl(operation, key, bucketId),
    headObject: (key) => headObject(key, bucketId),
    saveFile: (key, file) => uploadFile(key, file, bucketId),
    deleteObject: (key) => deleteObject(key, bucketId),
  }
}

function getSignedUrl(operation: string, key: string, bucketId: string) {
  return s3.getSignedUrlPromise(operation, {
    Bucket: bucketId,
    Key: key,
    Expires: SIGNED_URL_EXPIRES.as("seconds"),
  })
}

async function headObject(
  key: string,
  bucketId: string
): Promise<HeadObjectOutput> {
  return await s3
    .headObject({
      Bucket: bucketId,
      Key: key,
    })
    .promise()
}

async function uploadFile(
  key: string,
  file: FakeAwsFile,
  bucketId: string
): Promise<string> {
  const { Body, ..._ } = file
  await s3
    .upload({
      Bucket: bucketId,
      Key: key,
      Body,
    })
    .promise()
  const url = await getSignedUrl("getObject", key, bucketId)
  return url
}

async function deleteObject(key: string, bucketId: string) {
  await s3
    .deleteObject({
      Bucket: bucketId,
      Key: key,
    })
    .promise()
}
