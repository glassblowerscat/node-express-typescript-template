import { GetObjectOutput, HeadObjectOutput } from "aws-sdk/clients/s3"
import { Duration } from "luxon"
import { getLocalBucket } from "./localBucket"
import { getS3Bucket } from "./s3Bucket"

export const SIGNED_URL_EXPIRES = Duration.fromObject({ minutes: 60 })

export type FakeAwsFile = Required<Pick<GetObjectOutput, "ContentType">> &
  Pick<GetObjectOutput, "ContentLength" | "LastModified"> & { Body: Buffer }

export interface FileBucket {
  getSignedUrl(
    operation: string,
    key: string,
    bucketId?: string
  ): Promise<string>
  headObject(key: string, bucketId?: string): Promise<HeadObjectOutput>
  saveFile(key: string, file: FakeAwsFile, bucketId?: string): Promise<string>
  deleteObject(key: string, bucketId?: string): Promise<void>
}

const bucketId = process.env.BUCKET_ID

export function getBucket(): FileBucket {
  if (process.env.NODE_ENV === "development") {
    return getLocalBucket()
  } else if (bucketId) {
    return getS3Bucket(bucketId)
  } else {
    throw new Error("Bucket not set.")
  }
}
