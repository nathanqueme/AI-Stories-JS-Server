/**
 * version 1.0.0
 * 
 * Created on the 05/02/2023
 * 
 * // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-services-that-work-with-iam.html
 */

import { AwsCredentialIdentity } from "@aws-sdk/types";
import { TranslateClient } from "@aws-sdk/client-translate"
import { ComprehendClient } from "@aws-sdk/client-comprehend"
import { S3Client } from "@aws-sdk/client-s3"


const region = "eu-west-1"
// IAM user
const credentials: AwsCredentialIdentity = {
    accessKeyId: process.env.AWS_BACKEND_ACCESS_KEY ?? "",
    secretAccessKey: process.env.AWS_BACKEND_SECRET_KEY ?? ""
}

export const translateClient = new TranslateClient({ region, credentials })
export const comprehendClient = new ComprehendClient({ region, credentials })
export const s3Client = new S3Client({ region, credentials })