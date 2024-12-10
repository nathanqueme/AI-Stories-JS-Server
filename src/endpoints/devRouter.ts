/**
 * devRouter.ts
 * version 1.0.0
 * 
 * Created on the 25/07/2023
 */

import axios from "axios";
import express, { Request, Response } from "express"
import { createCollectibleAssets, createStoryTranslation, imageProcessing } from "../services";
import { isStringValid } from "../utils";


function getDevAsset(filename: string) {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const imagePath = path.join(__dirname, `../utils/assets/dev/${filename}`);
            fs.readFile(imagePath, (err: any, data: Buffer) => {
                if (err) {
                    console.log(err);
                    reject(err)
                } else {
                    resolve(data as Buffer)
                }
            });
        } catch (error) {
            reject(error)
        }
    })
}

const dev = {
    async test(req: Request, res: Response) {

        const StoryTranslation = await
            createStoryTranslation("Hello my name is Joe",
                [], "Hello this is a story title", "A helmet", "en", "fr", "123", 1)

        res.json(StoryTranslation)
        // res.json(`DEV TEST`);
    },
    async testImageColorizationAPI(req: Request, res: Response) {
        try {

            let otherImage = req.query.otherImage == "true",
                imageBuffer = await getDevAsset(otherImage ? "demo1.png" : "demo2.png"),
                hex = req.query.hex as string,
                tolerance = Number(req.query.tolerance) as number,
                contrast = Number(req.query.contrast) as number,
                reducePixelation = req.query.reducePixelation == "true"

            if (req.query.ignoreModif == "true") {
                res.setHeader("Content-Type", "image/jpeg")
                return res.send(imageBuffer)
            }

            var logName = "✅ Done in: "; console.time(logName);
            console.log("🌈 CHANGING COLOR WITH OPTIONS :")
            console.log({ color: hex, tolerance, contrast, reducePixelation, })
            const newImage = await imageProcessing.changeImageColor(imageBuffer, { hex }, {
                tolerance, contrast, reducePixelation
            })
            console.timeEnd(logName)
            res.setHeader("Content-Type", "image/jpeg")
            res.send(newImage)

        } catch (error) {
            console.log(error)
            res.status(400).json(error)
        }
    },
    async preview3DCollectibleAssets(req: Request, res: Response) {

        // NOTE - WARNING : BLACK OBJECTS ARE NOT SUPPORTED
        // If an object contains any black, HOLES will appear in the areas were black 
        // is detected because this function clears black pixels.

        var silhouetteIndex = req.query.silhouetteIndex as string
        var renderType: "s" | "ws" | "bs" | "gif" = req.query.renderType as any
        if (!isStringValid(silhouetteIndex)) return res.sendStatus(400);

        try {
            const gif = await getDevAsset(`gifs/${req.query.gifN}.gif`)
            const assets = await createCollectibleAssets(gif, Number(silhouetteIndex))

            if (renderType === "bs" || renderType === "ws" || renderType === "s") {
                res.set("Content-Type", "image/png");
                switch (renderType) {
                    case "bs": return res.send(assets.black_silhouette)
                    case "ws": return res.send(assets.white_silhouette)
                    case "s": return res.send(assets.silhouette)
                }
            }
            res.set("Content-Type", "image/gif")
            res.send(assets.newGif)

        } catch (error) {
            console.log(error)
            res.sendStatus(500)
        }
    },
}


// MAIN ROUTES (not available on prod)
// NOTE: this is the only router without controller (where functions are directly written in same file)
const router = express.Router()
router.get('/test', dev.test)
router.get('/test/imageColorization', dev.testImageColorizationAPI)
router.get('/test/preview3DCollectibleAssets', dev.preview3DCollectibleAssets)


export default router