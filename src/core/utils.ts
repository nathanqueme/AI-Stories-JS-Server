/**
 * utils.ts
 * version 1.0.0
 * 
 * Created on the 24/04/2023
 */

import sharp from 'sharp'


export async function compressImage(
    body: Buffer, 
    maxSize = 260
): Promise<Buffer> {
    try {

        const maxSizeInBytes = maxSize * 1024;
        const sizeInBytes = Buffer.byteLength(body);
        if (sizeInBytes <= maxSizeInBytes) {
            return body;
        }

        let quality = 100;
        let compressedImage = body;
        let compressedSizeInBytes = sizeInBytes;
        while (compressedSizeInBytes > maxSizeInBytes && quality > 1) {
            quality--;
            compressedImage = await sharp(body)
                .jpeg({ quality })
                .toBuffer();
            compressedSizeInBytes = Buffer.byteLength(compressedImage);
        }

        return compressedImage;
    } catch (error) {
        console.error('An error occurred while compressing the image:', error);
        throw error;
    }
}