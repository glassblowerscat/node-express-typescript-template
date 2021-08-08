import { S3 } from "aws-sdk"
import { HeadObjectOutput } from "aws-sdk/clients/s3"
import { FileBucket, SIGNED_URL_EXPIRES } from "./definitions"

const s3 = new S3()

export function getS3Bucket(bucketId: string): FileBucket {
  return {
    getSignedUrl: getSignedUrl.bind(bucketId),
    headObject: headObject.bind(bucketId),
    moveObject: moveObject.bind(bucketId),
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

async function moveObject(oldKey: string, newKey: string, bucketId: string) {
  await copyObject(oldKey, newKey, bucketId)
  await deleteObject(oldKey, bucketId)
}

async function copyObject(oldKey: string, newKey: string, bucketId: string) {
  await s3
    .copyObject({
      Bucket: bucketId,
      CopySource: `${bucketId}/${oldKey}`,
      Key: newKey,
    })
    .promise()
}

async function deleteObject(key: string, bucketId: string) {
  await s3
    .deleteObject({
      Bucket: bucketId,
      Key: key,
    })
    .promise()
}
