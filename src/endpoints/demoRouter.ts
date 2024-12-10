/**
 * demo.ts
 * version 1.0.0
 * 
 * Created on the 09/10/2023
 */

import express, { Request, Response } from "express"
import multer from "multer";
import { imageProcessing } from "../services";
import { deleteFile, readLocalFileBuffer } from "../utils/functions/local";
export const uploadsFolder = multer({ dest: 'uploads/' });
const router = express.Router();

const demoController = {
    utils: {
        extractImageToColorize(req: Request) {
            const files = req.files as { [key: string]: Express.Multer.File[] },
                image = files['image']?.[0] ?? null
            if ((image === null)) throw "❌ Missing image(s)"
            return { image }
        }
    },
    async handleColorizeImage(req: Request, res: Response) {
        let imagePath: string | null = null
        try {

            const { image } = demoController.utils.extractImageToColorize(req)
            imagePath = image.path
            let start = new Date(),
                imageBuffer = await readLocalFileBuffer(imagePath),
                hex = req.body.hex as string,
                tolerance = Number(req.body.t) as number,
                contrast = Number(req.body.c) as number,
                reducePixelation = (req.body.rp == "1") || (req.body.rp == "true")

            var logName = "✅ Done in: "; console.time(logName);
            console.log("\n<----- 🌈 CHANGING COLOR WITH OPTIONS ----->")
            console.log({ hex, tolerance, contrast, reducePixelation, image, imageBufferLenght: imageBuffer.length })

            const newBuffer = await imageProcessing.changeImageColor(imageBuffer, { hex }, {
             tolerance, contrast, reducePixelation
            }),
                imageBase64 = newBuffer.toString('base64'),
                mimeType = "image/png",
                dataURL = `data:${mimeType};base64,${imageBase64}`;

            console.timeEnd(logName)
            const durationInMilliSecs = new Date().getTime() - start.getTime()
            res.json({ base64: dataURL, durationInMilliSecs })
           
        } catch (error) {
            console.log(error)
            res.status(400).json(error)
        }

        // CLEAN UP
        if (imagePath)
            try {
                const response = await deleteFile(imagePath); console.log(response)
            } catch (error) {
                console.log(error)
                // DO NOTHING IF ERROR
            }
    },
    async startGoogleCloudServer(req: Request, res: Response) {
        res.sendStatus(200)
    }
}

// MAIN ROUTES
router.get("/start", demoController.startGoogleCloudServer)
router.post("/colorize-image", uploadsFolder.fields([{ name: 'image' }]),
    demoController.handleColorizeImage)

export default router