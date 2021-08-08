import { HeadObjectOutput } from "aws-sdk/clients/s3"
import { Duration } from "luxon"

export const SIGNED_URL_EXPIRES = Duration.fromObject({ minutes: 15 })

export interface FileBucket {
  getSignedUrl(
    operation: string,
    key: string,
    bucketId?: string
  ): Promise<string>
  headObject(key: string, bucketId?: string): Promise<HeadObjectOutput>
  moveObject(oldKey: string, newKey: string, bucketId?: string): Promise<void>
}
