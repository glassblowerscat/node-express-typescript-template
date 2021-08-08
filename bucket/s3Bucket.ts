import { S3 } from "aws-sdk"
import { HeadObjectOutput } from "aws-sdk/clients/s3"
import { FileBucket, SIGNED_URL_EXPIRES } from "./bucket"

const s3 = new S3()

export function getS3Bucket(bucketId: string): FileBucket {
  return {
    getSignedUrl: getSignedUrl.bind(null, bucketId),
    headObject: headObject.bind(null, bucketId),
    moveObject: moveObject.bind(null, bucketId),
  }
}

function getSignedUrl(bucketId: string, operation: string, key: string) {
  return s3.getSignedUrlPromise(operation, {
    Bucket: bucketId,
    Key: key,
    Expires: SIGNED_URL_EXPIRES.as("seconds"),
  })
}

async function headObject(
  bucketId: string,
  key: string
): Promise<HeadObjectOutput> {
  return await s3
    .headObject({
      Bucket: bucketId,
      Key: key,
    })
    .promise()
}

async function moveObject(bucketId: string, oldKey: string, newKey: string) {
  await copyObject(oldKey, newKey, bucketId)
  await deleteObject(oldKey, bucketId)
}

async function copyObject(bucketId: string, oldKey: string, newKey: string) {
  await s3
    .copyObject({
      Bucket: bucketId,
      CopySource: `${bucketId}/${oldKey}`,
      Key: newKey,
    })
    .promise()
}

async function deleteObject(bucketId: string, key: string) {
  await s3
    .deleteObject({
      Bucket: bucketId,
      Key: key,
    })
    .promise()
}
