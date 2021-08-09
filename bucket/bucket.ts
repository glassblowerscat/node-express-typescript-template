import { GetObjectOutput, HeadObjectOutput } from "aws-sdk/clients/s3"
import { Duration } from "luxon"
import { Prisma } from "@prisma/client"
import { getLocalBucket } from "./localBucket"
import { getS3Bucket } from "./s3Bucket"

export const SIGNED_URL_EXPIRES = Duration.fromObject({ minutes: 15 })

export type FileUpload = Prisma.FileCreateInput & { Body: Buffer }

export type FakeAwsFile = Required<Pick<GetObjectOutput, "ContentType">> &
  Pick<GetObjectOutput, "ContentLength" | "LastModified"> & { Body: Buffer }

export interface FileBucket {
  getSignedUrl(
    operation: string,
    key: string,
    bucketId?: string
  ): Promise<string>
  headObject(key: string, bucketId?: string): Promise<HeadObjectOutput>
  moveObject(oldKey: string, newKey: string, bucketId?: string): Promise<void>
  saveFile(key: string, file: FileUpload): Promise<string>
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
