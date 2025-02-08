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
 * Extracts all frames of a GIF and enables to modify them.
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

    const width = gifReader.width;
    const height = gifReader.height;
    const frameBuffer = Buffer.alloc(width * height * 4);

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const frameInfo = gifReader.frameInfo(frameIndex)
        gifReader.decodeAndBlitFrameRGBA(frameIndex, frameBuffer);

        if (newBgColor !== null)
            for (let i = 0; i < frameBuffer.length; i += 4) {
                const red = frameBuffer[i];
                const green = frameBuffer[i + 1];
                const blue = frameBuffer[i + 2];
                const threshold = black_tolerance;
                // Check if the pixel is black (all channels are 0)
                if (red <= threshold && green <= threshold && blue <= threshold) {
                    // CHANGE BACKGROUND COLOR 
                    frameBuffer[i] = newBgColor.r;       // Red
                    frameBuffer[i + 1] = newBgColor.g;   // Green
                    frameBuffer[i + 2] = newBgColor.b;   // Blue
                    frameBuffer[i + 3] = newBgColor.a;   // Alpha
                }
            }

        const png = new PNG({ width, height });
        // Copy the frame's RGBA buffer data to the PNG
        png.data = frameBuffer;
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
    const firstImage = await Jimp.read(imageBuffers[0]);
    const width = firstImage.getWidth();
    const height = firstImage.getHeight();

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const encoder = new GIFEncoder(width, height);

    // GIFEncoder options
    encoder.setRepeat(repeat ? 0 : -1);
    encoder.setDelay(delay);  // frame delay in ms
    encoder.setQuality(10);   // image quality. 10 is default
    if (transparent) encoder.setTransparent(0)

    encoder.start();

    async function addFrame(imageBuffer: Buffer) {
        const image = await loadImage(imageBuffer)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        encoder.addFrame(ctx);
    }

    for (const imgBuffer of imageBuffers) {
        await addFrame(imgBuffer);
    }

    encoder.finish();
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
    const frames = await processGifFrames(buffer, { hex: hexColor });
    var imageBuffers = frames.flatMap(el => el.buffer);

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
    const ratio = 1.1 
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