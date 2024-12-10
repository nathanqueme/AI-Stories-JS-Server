/**
 * gifProcessing.ts
 * version 1.0.0
 * 
 * Created on the 23/06/2023
 */

import fs from 'fs';
import Jimp from 'jimp';
import GIFEncoder from 'gifencoder';
import { GifReader } from 'omggif';
import { PNG } from 'pngjs';
import { createCanvas, loadImage } from 'canvas';
import { hexToRgba, RGBAcolor } from './imageProcessing';
import { isStringValid } from '../utils';


/**
 * Extracts all frames of a GIF and enables you to modify them.
 * 
 * @param buffer                  The Buffer of the GIF file.
 * 
 * @param replaceBlackByColor                 (ONLY WORKS IF THE INITIAL BACKGROUND COLOR IS BLACK) The color
 *                                you want the background to be. If provided must be either HEX or 
 *                                RGBA color
 * 
 * @param bgColor.hex             a color in the format "#437475", use "#00000000" to make the 
 *                                background transparent and remove any color
 * 
 * @param bgColor.rgba            a color in the following format: {r: 0, g: 0, b: 0, a: 0} with each 
 *                                value between 0-255
 * 
 * @returns                       An object containing each frame with it's buffer and information.
 * 
 * 
 * BUILT WITH 2 OPEN SOURCE LIBRARIES:
 * import { GifReader } from 'omggif'
 * import { PNG } from 'pngjs'
*/
export async function processGifFrames(buffer: Buffer,
    replaceBlackByColor?: { hex?: string | null, rgba?: RGBAcolor | null }, 
    black_tolerance = 27) {

    var newBgColor: RGBAcolor | null = null
    if (isStringValid(replaceBlackByColor?.hex)) {
        newBgColor = hexToRgba(replaceBlackByColor!.hex!);
    } else if ((replaceBlackByColor?.rgba) && (typeof replaceBlackByColor.rgba === "object")) {
        newBgColor = replaceBlackByColor.rgba
    }
    const gifReader = new GifReader(buffer);
    const frameCount = gifReader.numFrames();
    const frames = [];

    // Pre-allocate the frame buffer outside the loop
    // NOTE: (IMPORTANT) if you allocate the buffer inside the loop: 
    // - the quality will be really bad 
    // - because it is computationally expensive it would be longer
    const width = gifReader.width;
    const height = gifReader.height;
    const frameBuffer = Buffer.alloc(width * height * 4);

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const frameInfo = gifReader.frameInfo(frameIndex)
        // This library extracts the frames GIF as RGBA buffers, and to save
        // them as valid PNG files, you need to use an appropriate library 
        // to convert the RGBA buffers to PNG format.
        gifReader.decodeAndBlitFrameRGBA(frameIndex, frameBuffer);

        // Iterate through each pixel in the RGBA buffer
        if (newBgColor !== null)
            for (let i = 0; i < frameBuffer.length; i += 4) {
                const red = frameBuffer[i];
                const green = frameBuffer[i + 1];
                const blue = frameBuffer[i + 2];
                // const alpha = frameBuffer[i + 3];

                // Adjust this value to control the tolerance, the highter means dark gray will be accepted too. 0 means only pure black.
                const threshold = black_tolerance;
                // Check if the pixel is black (all channels are 0)
                if (red <= threshold && green <= threshold && blue <= threshold) {
                    // CHANGE BACKGROUND COLOR 
                    frameBuffer[i] = newBgColor.r;       // Red
                    frameBuffer[i + 1] = newBgColor.g;   // Green
                    frameBuffer[i + 2] = newBgColor.b;   // Blue
                    // Set the alpha channel to 0 if you want a transparent bg
                    frameBuffer[i + 3] = newBgColor.a;   // Alpha
                }
            }

        // Create a PNG instance and set its dimensions
        const png = new PNG({ width, height });
        // Copy the frame's RGBA buffer data to the PNG instance
        png.data = frameBuffer;

        // Convert RGBA buffer to PNG buffer
        const pngBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            png.pack()
                .on('data', (chunk) => chunks.push(chunk))
                .on('end', () => resolve(Buffer.concat(chunks)))
                .on('error', (error) => reject(error));
        });

        frames.push({ buffer: pngBuffer, ...frameInfo });
    }

    return frames;
}


/**
 * 
 * @param imageBuffers      Each image making the GIF.
 * 
 * @param delay             The delay you want between each frame of the GIF.
 * 
 * @param transparent       Weither you want the background to be transparent.
 *                          FALSE by default
 * 
 * @param repeat            Weither the GIF should be an infinite loop.
 *                          TRUE by default 
 * @returns 
 */
export async function generateGif(
    imageBuffers: Buffer[],
    delay: number,
    transparent = false,
    repeat = true
) {

    // use the first image's dimensions
    const firstImage = await Jimp.read(imageBuffers[0]);
    const width = firstImage.getWidth();
    const height = firstImage.getHeight();

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const encoder = new GIFEncoder(width, height);

    // Set GIFEncoder options
    encoder.setRepeat(repeat ? 0 : -1);
    encoder.setDelay(delay);  // frame delay in ms
    encoder.setQuality(10);   // image quality. 10 is default
    if (transparent) encoder.setTransparent(0)

    // Start encoding the GIF
    encoder.start();

    async function addFrame(imageBuffer: Buffer) {
        const image = await loadImage(imageBuffer)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        /** @ts-ignore */
        encoder.addFrame(ctx);
    }

    // Loop through the image URLs and add frames
    for (const imgBuffer of imageBuffers) {
        await addFrame(imgBuffer);
    }

    // Finish encoding the GIF
    encoder.finish();

    // Get the GIF buffer
    const gifBuffer = encoder.out.getData();

    return gifBuffer;
};

/**
 * 
 * @param buffer the buffer of the GIF
 *
 */
export async function watermarkGif(buffer: Buffer) {

    // #00000000 used to remove the black background
    const hexColor = "#00000000";
    // NOTE (IMPORTANT) do not remove the black baground when you watermak the gif 
    // othewise letters are blurry and pixelated
    const frames = await processGifFrames(buffer, { hex: hexColor });
    var imageBuffers = frames.flatMap(el => el.buffer);

    // add a watermark 
    function getWatermark() {
        return new Promise<Buffer>((resolve, reject) => {
            const watermarkPath = "src/utils/assets/images/watermark.png";
            fs.readFile(watermarkPath, (err, data) => {
                if (err) {
                    return reject(err);
                };
                resolve(data);
            });
        })
    };
    const watermarkBuffer = await getWatermark();
    var watermarkImage = await Jimp.read(watermarkBuffer);
    const ratio = 1.1 // does not look too pixelated with this ratio
    watermarkImage.resize(70 * ratio, 54 * ratio)
    const offsets = [
        { x: 0.08, y: 0.7 },  // bottom left
        { x: 0.08, y: 0.55 }, // middle left
        { x: 0.70, y: 0.14 }, // up right
        { x: 0.70, y: 0.7 },  // bottom right
    ]
    const randomIdx = Math.floor(Math.random() * 4)
    const x = frames[0].width * offsets[randomIdx].x
    const y = frames[0].height * offsets[randomIdx].y
    imageBuffers = await Promise.all(imageBuffers.map(async (imageBuffer) => {
        var image = await Jimp.read(imageBuffer)
        // Overlay the images
        image.composite(watermarkImage, x, y);
        const finalImgBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return finalImgBuffer
    }))

    // re-create gif
    const delay = 100;
    const gif = await generateGif(imageBuffers, delay);
    return gif
};