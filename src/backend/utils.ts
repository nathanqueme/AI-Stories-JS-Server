/**
 * utils.ts
 * version 1.0.0
 * 
 * Created on the 24/04/2023
 */

import sharp from 'sharp'


/** (CAN BE LONG FOR THE USER -> NOT RECOMMEND TO CALL DIRECTLY FROM CLIENT / MAKE USER WAIT)
 * - Reduces an image size without degrading it's overall quality.
 * - By default: reduces the img size to 260 kB
 * - Loading time: compressing a 640kB img to 260 kB takes about 7-9 secs.
 * 
 * EFFICIENCY DESCRIPTION: works well with traditional photos but with openais' DALL-E imgs the size gets almost twice as as small. INSTEAD OF 260 kB -> 130 kB
 */
export async function compressImage(body: Buffer, maxSize = 260): Promise<Buffer> {
    try {

        // Set the maximum allowed size in bytes (260 kB by default)
        const maxSizeInBytes = maxSize * 1024;

        // Get the current size of the image in bytes
        const sizeInBytes = Buffer.byteLength(body);

        // Check if the image is already small enough
        if (sizeInBytes <= maxSizeInBytes) {
            return body;
        }

        // Calculate the quality needed to achieve the target size
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