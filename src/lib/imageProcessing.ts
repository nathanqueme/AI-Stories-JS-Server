/**
 * imageProcessing.ts
 * version 1.0.0
 * 
 * Created on the 20/05/2023
 */

import Jimp from 'jimp'
import { devtools, isStringValid, useOptionalNumber } from '../utils'

export interface RGBAcolor {
    r: number
    g: number
    b: number
    a: number
}

export function hexToRgba(hex: string) {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) : 255;

    return { r, g, b, a };
}

/** 
 * Returns the provided color in RGBA format.
 * 
 * @param color         either `color.hex` OR `color.rgba` MUST be provided.
 */
export function useColorParam(color: { hex?: string | null, rgba?: RGBAcolor | null }) {
    var lineColor: RGBAcolor | null = null
    if (isStringValid(color?.hex)) {
        lineColor = hexToRgba(color!.hex!);
    } else if ((color?.rgba) && (typeof color.rgba === "object")) {
        lineColor = color.rgba
    }
    if (lineColor === null) throw new Error('Missing required parameter "color".');
    return lineColor
}

async function getEqualizedImage(originalImg: Jimp, tolerance: number, whiteColor: RGBAcolor, lineColor: RGBAcolor) {
    const equalizedImage = originalImg.clone().normalize(); 

    // Array to store the frequency of pixel intensities
    const histogram = new Array(256).fill(0);

    equalizedImage.scan(0, 0, equalizedImage.bitmap.width, equalizedImage.bitmap.height, function (x, y, idx) {
        // true for all white pixels
        const isBackgroundPixel = (
            Math.abs(this.bitmap.data[idx] - whiteColor.r) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 1] - whiteColor.g) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 2] - whiteColor.b) <= tolerance
        );

        if (!isBackgroundPixel) {
            const intensity = this.bitmap.data[idx];
            histogram[intensity]++; 
        }
    });

    // Compute the cumulative distribution function (CDF) for non-background pixels
    const cdf = new Array(256).fill(0);

    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
    };

    // Normalize the CDF for non-background pixels
    const cdfMin = Math.min(...cdf);
    const cdfMax = Math.max(...cdf);
    const cdfRange = cdfMax - cdfMin;

    const normalizedCdf = cdf.map((value) => {
        return Math.round(((value - cdfMin) / cdfRange) * 255);
    });

    // Apply histogram equalization to non-background pixels
    equalizedImage.scan(0, 0, equalizedImage.bitmap.width, equalizedImage.bitmap.height, function (x, y, idx) {
        const isBackgroundPixel = (
            Math.abs(this.bitmap.data[idx] - whiteColor.r) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 1] - whiteColor.g) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 2] - whiteColor.b) <= tolerance
        );

        if (!isBackgroundPixel) {
            const intensity = this.bitmap.data[idx]; // Get the intensity value of the current pixel
            const equalizedIntensity = normalizedCdf[intensity]; // Get the equalized intensity value
            const intensityFactor = intensity / 255; // Normalize the intensity to a range of 0 to 1

            // a value between 0-1
            // When set to 1, there is no contrast so the color is replaced by the exact colorLine and the drawing looks flat, no shadows, no volumes, diff intensities, etc.
            // when set to 0, will apply the colorLine while preserving the original contrast, opacity and so volumes, shadows, color differences etc.
            // NOTE when the contrast is fully preserved, (contrast_loss = 0) the dark lines stay black. In other words, the colorLine is almost not beeing applied to them.
            const contrast_loss = 0
            let contrastFactor;
            if (intensityFactor >= contrast_loss) {
                contrastFactor = intensityFactor;
            } else {
                contrastFactor = 1; // Apply colorLine without colorization factor
            }

            // Calculate the colorized pixel values based on lineColor and equalized intensity and by applying your "contrast_loss" 
            var contrast_preservence_ratio = ((equalizedIntensity / 255) * (contrastFactor) / (equalizedIntensity / 255))
            const colorizedR = Math.round(contrast_preservence_ratio * lineColor.r);
            const colorizedG = Math.round(contrast_preservence_ratio * lineColor.g);
            const colorizedB = Math.round(contrast_preservence_ratio * lineColor.b);

            // OTHER COLORIZATION TECHNIQUES : 
            // const colorizedR = equalizedIntensity (full contrast but black)
            // const colorizedR = lineColor.r (no contrast but right color)

            this.bitmap.data[idx] = colorizedR; // R
            this.bitmap.data[idx + 1] = colorizedG; // G
            this.bitmap.data[idx + 2] = colorizedB; // B
        }
    });

    return equalizedImage;
}

async function getBaseImage(originalImg: Jimp, tolerance: number, whiteColor: RGBAcolor, lineColor: RGBAcolor) {
    var baseImage = originalImg.clone().normalize();
    baseImage.scan(0, 0, baseImage.bitmap.width, baseImage.bitmap.height, function (x, y, idx) {
        const isBackgroundPixel = (
            Math.abs(this.bitmap.data[idx] - whiteColor.r) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 1] - whiteColor.g) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 2] - whiteColor.b) <= tolerance &&
            Math.abs(this.bitmap.data[idx + 3] - whiteColor.a) <= tolerance
        );

        if (!isBackgroundPixel) {
            const alpha = this.bitmap.data[idx + 3] / 255; // Calculate alpha value as a ratio (0 to 1)
            // not sure the (1 - alpha) * this.bitmap.data[idx] + alpha has a big effect
            const newRed = Math.round((1 - alpha) * this.bitmap.data[idx] + alpha * lineColor.r);
            const newGreen = Math.round((1 - alpha) * this.bitmap.data[idx + 1] + alpha * lineColor.g);
            const newBlue = Math.round((1 - alpha) * this.bitmap.data[idx + 2] + alpha * lineColor.b);
            const newAlpha = this.bitmap.data[idx + 3];

            this.bitmap.data[idx] = newRed;
            this.bitmap.data[idx + 1] = newGreen;
            this.bitmap.data[idx + 2] = newBlue;
            this.bitmap.data[idx + 3] = newAlpha;
        }
    });
    return baseImage;
}

async function colorizeAllPixels(originalImg: Jimp, lineColor: RGBAcolor) {
    var baseImage = originalImg.clone().normalize();
    baseImage.scan(0, 0, baseImage.bitmap.width, baseImage.bitmap.height, function (x, y, idx) {

        const alpha = this.bitmap.data[idx + 3] / 255; // Calculate alpha value as a ratio (0 to 1)
        // not sure the (1 - alpha) * this.bitmap.data[idx] + alpha has a big effect
        const newRed = Math.round((1 - alpha) * this.bitmap.data[idx] + alpha * lineColor.r);
        const newGreen = Math.round((1 - alpha) * this.bitmap.data[idx + 1] + alpha * lineColor.g);
        const newBlue = Math.round((1 - alpha) * this.bitmap.data[idx + 2] + alpha * lineColor.b);
        const newAlpha = this.bitmap.data[idx + 3];

        this.bitmap.data[idx] = newRed;
        this.bitmap.data[idx + 1] = newGreen;
        this.bitmap.data[idx + 2] = newBlue;
        this.bitmap.data[idx + 3] = newAlpha;

    });
    return baseImage;
}


/** 
 * Colorizes the image in the given color while preserving it's white background.
 * 
 * @param imageBuffer       The buffer of the image to change.
 * 
 * @param color             The color you want to change the lines of the image to (applied 
 *                          to all non white pixels). Must be either a HEX or RGBA color.
 * 
 * * @param bgColor.hex     A color in the format "#437475", use "#00000000" to make the 
 *                          background transparent and remove any color
 * 
 * @param bgColor.rgba      A color in the following format: {r: 0, g: 0, b: 0, a: 0} with each 
 *                          value between 0-255
 *                
 * @param tolerance         A value between 0-255 which determines how easily pixels 
 *                          get considered as background pixels (= white pixels). A 
 *                          background pixel is a pixel which is ignored during the 
 *                          colorization process
 *                          - usages: 
 *                            - 1: enables isolating the background during colorization 
 *                            - 2: helps reduce pixels a LITTLE when increased
 *                          - default value: `34`
 *                          - recommendation : `20` minimum - `40` max
 *                          - ☝️ (THIS PARAM NEEDS TO BE HIGH ENOUGHT FOR GOOD RESULTS 
 *                          but NOT TOO LOW)
 *                          - effect: 
 *                            - The higher the more lines and shapes are properly
 *                              delimited. 
 *                            - When too low, some lines can be merged and pixelated. 
 *                            - When too high: a lot of pixels are not being colorized
 *                              because too many pixels get considered as background 
 *                              pixels
 * 
 * @param  contrast        A value between 0-1 (e.g. 0.5 for 50%) which improves the 
 *                         colorization and preserves the original image's aspect.
 *                         - preserves the initial:
 *                           - `colors intensity`, e.g. "light" green VS "dark"
 *                           green
 *                           - distinction between `different shades of colors`, e.g. 
 *                             colors overlayed one on the other
 *                           - `shadows` and `volumes`
 *                           - it also improves the `visibility` of the final image
 *                         - default value: `0.55`
 *                         - recommendation for:
 *                           - `BRIGHT` colors: between `0.45` - `0.55`
 *                           - `DARK` colors OR images with almost no white pixels need
 *                           higher values: mininum `0.55`
 *                           - in general : between `0.35` - `0.65` is a good value.
 *                          Under 0.35, all lines are in the same color resulting in a 
 *                          FLAT image. Above 0.65, some lines get really black AND 
 *                          colors get quite dark. 
 *                         - for curious people: this is done by using `"histogram 
 *                           equalization"`, a contrast enhancement technique
 * 
 * @param reducePixelation A boolean value which, if set to `true`, will reduce the 
 *                         image's pixelation. 
 *                         - ☝️ drawback: when set to `true` the entire function is 
 *                           `2 TIME SLOWER`
 *                         - this is done by `"scaling up"` the image before it
 *                           it is colorized and `"scaling it down"` when done.
 *                         - the `"scale up"` method will scale the image up by 
 *                           `2` (more than X2 does not improve the result), then 
 *                           SCALE it back to it's original size (width AND height) 
 * 
 * @returns                The buffer of the image with the given hex color. 
 * 
 * IMPROVEMENT NOTES: 
 * - images can get quite PIXELATED especially when the hex color is very dark
 * 
 * QUICK EXPLANATION: 
 * works by scaning all pixels of the image and changing the image of all non-white pixels
 * using two different techniques and merging them together based on the params
 * 
 */
export async function changeImageColor(
    imageBuffer: Buffer,
    color: { hex?: string | null, rgba?: RGBAcolor | null },
    options?: { tolerance?: number, contrast?: number, reducePixelation?: boolean }
) {

    // OPTIONS
    const tolerance = useOptionalNumber(options?.tolerance, 34),
        contrast = useOptionalNumber(options?.contrast, 0.55),
        reducePixelation = options?.reducePixelation ?? false,
        lineColor = useColorParam(color), 
        CONTRAST = (1 - contrast),
        whiteColor = { r: 255, g: 255, b: 255, a: 255 };


    var image: Jimp = null as any
    try {
        image = await Jimp.read(imageBuffer);
    } catch (error) {
        devtools.log(error)
        throw error
    }


    // (OPTIONAL) PIXELISATION REDUCTION BY SCALING IMAGE BY 2
    var originalWidth = image.bitmap.width
    if (reducePixelation) {
        image.resize(image.bitmap.width * 2, Jimp.AUTO)
    }


    var equalizedImage: Jimp = null as any
    var baseImage: Jimp = null as any
    const queue = [
        // METHOD 1 (Apply contrast enhancement using histogram equalization)
        async () => { equalizedImage = await getEqualizedImage(image, tolerance, whiteColor, lineColor!) },
        // METHOD 2 (colorization with exact colorLine without preserving any contrast)
        async () => { baseImage = await getBaseImage(image, tolerance, whiteColor, lineColor!) },
    ]
    // process each action at the same time to try to save time (may not be efficient)
    await Promise.all(queue.map(async func => await func()))
    // COMBINE IMAGES (Applies contrast to the baseImage by overlaying it with the 
    // equalizedImage)
    // Set the opacity of the overlay image
    equalizedImage.opacity(Math.abs(CONTRAST - 1));
    // Overlay the images
    const x = 0;
    const y = 0;
    baseImage.composite(equalizedImage, x, y);


    // SCALE DOWN THE FINAL IMAGE IF IT WAS SCALED UP
    if (reducePixelation) {
        baseImage.resize(originalWidth, Jimp.AUTO)
    }


    const finalImgBuffer = await baseImage.getBufferAsync(Jimp.MIME_PNG);
    return finalImgBuffer

}


export async function changeAllPixelsColor(
    imageBuffer: Buffer,
    color: { hex?: string | null, rgba?: RGBAcolor | null }, 
    reducePixelation = false
) {

    const lineColor = useColorParam(color)
    var image: Jimp = null as any  
    try {
        image = await Jimp.read(imageBuffer);
    } catch (error) {
        devtools.log(error)
        throw error
    }

    var originalWidth = image.bitmap.width
    if (reducePixelation) {
        image.resize(image.bitmap.width * 2, Jimp.AUTO)
    }
    var baseImage: Jimp = await colorizeAllPixels(image, lineColor)
    if (reducePixelation) {
        baseImage.resize(originalWidth, Jimp.AUTO)
    }

    const finalImgBuffer = await baseImage.getBufferAsync(Jimp.MIME_PNG);
    return finalImgBuffer
}
