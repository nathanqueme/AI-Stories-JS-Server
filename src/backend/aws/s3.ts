/**
 * s3.ts
 * version 1.0.0
 * 
 * Created on the 19/03/2023
 */

import axios from "axios";
import { s3Client, S3_BUCKET_NAME } from "../configs";
import {
    PutObjectCommand, PutObjectCommandInput, DeleteObjectCommandInput,
    DeleteObjectCommand, HeadObjectCommand, ListObjectsCommand
} from "@aws-sdk/client-s3";
import { compressImage } from "../utils"

/** Uploads the given file to S3. */
export async function putContent(body: any, fileName: string, contentType = 'image/jpeg') {
    try {
        const params: PutObjectCommandInput = {
            Bucket: S3_BUCKET_NAME,
            Key: fileName,
            Body: body,
            ContentType: contentType, // MIME media type
            CacheControl: "no-cache" // see : https://github.com/aws-amplify/amplify-js/issues/6693#issuecomment-729855538
        }
        const data = await s3Client.send(new PutObjectCommand(params))
        return data
    } catch (error) {
        throw error
    }
}


/** Deletes an item from S3 */
export async function deleteContent(fileName: string) {
    try {
        var params: DeleteObjectCommandInput = {
            Bucket: S3_BUCKET_NAME,
            Key: fileName,
        }
        const data = await s3Client.send(new DeleteObjectCommand(params))
        return data
    } catch (error) {
        throw error
    }
}


/** 
 * Deletes a folder and its contents from S3 
 * @param folderName        e.g. "images_colorized/story123"
 */
export async function deleteFolder(folderName: string) {
    try {

        const listParams = {
            Bucket: S3_BUCKET_NAME,
            Prefix: folderName,
        };
        const list = await s3Client.send(new ListObjectsCommand(listParams));
        if (!list.Contents) return "✅ folder already deleted"

        const deletePromises = list.Contents
            .filter(el => el.Key)   // Do not include items without keys
            .map(async (object) => {
                console.log(object.Key)
                const deleteParams = {
                    Bucket: S3_BUCKET_NAME,
                    Key: object.Key,
                };
                return s3Client.send(new DeleteObjectCommand(deleteParams));
            });

        await Promise.all(deletePromises);
        
        return "✅ folder deleted";
    } catch (error) {
        throw error;
    }
}


/** 
 * - 1 - LOADS IMAGE
 * - 2 - (OPTIONAL) COMPRESSES IMAGE, is enabled by default 
 * - 3 - UPLOADS IMAGE
 * 
 * Can be used for GIFs by specifying the right params. e.g compress = false
 */
export async function uploadImage(data: { imageBuffer?: Buffer, imageUrl?: string },
    fileName: string, compress = true, contentType = 'image/jpeg') {
    try {
        // 1 - 
        const buffer = data.imageBuffer ? data.imageBuffer :
            data.imageUrl ?
                Buffer.from((await axios.get(data.imageUrl, { responseType: "arraybuffer" })).data, "binary") :
                null
        if (!buffer) throw "no-image-provided"
        // 2 - 
        var finalBuffer = compress ? await compressImage(buffer) : buffer
        // 3 - 
        await putContent(finalBuffer, fileName, contentType)
        return "✅ image uploaded"
    } catch (error) {
        throw error
    }
}


/**
 * @param fileName the path of the file on S3, e.g. "images/image.jpg"
 */
export async function checkIfFileExists(fileName: string) {
    const headObjectParams = new HeadObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: fileName,
    });
    try {
        await s3Client.send(headObjectParams)    // Call the S3 client to check if the object exists
        return true
    } catch (error) {
        return false
    }
}