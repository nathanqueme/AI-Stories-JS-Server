/**
 * stories.ts
 * version 1.0.0
 * 
 * Created on the 29/01/2023
 */

import express from "express";
import multer from "multer";
import { authController, storyController } from "../handlers";
export const uploadsFolder = multer({ dest: 'uploads/' });
const router = express.Router();

// MAIN ROUTES
router.get('/', storyController.main.handleGet)
router.get('/liked', storyController.main.handleGetLikedStories)
router.post('/likes', storyController.main.handleLikeOrUnlike)
router.get('/likes', storyController.main.handleGetStoryLike)
router.post('/metrics', storyController.main.handleIncrementStoryMetrics)

// STORY - MEDIA 
router.get('/audio', storyController.media.handleGetAudio)
router.get('/alternate-images-color', storyController.media.handleGetAlternateImagesColor)
router.get('/watermarked-gif', storyController.media.handleGetWatermarkedGif)

// USER - USAGE
router.post('/usage', storyController.usage.handlePostUsage)
router.get('/usage', storyController.usage.handleGetUsage)

// PRIVATE ROUTES (CONTENT EDITING)
router.get('/get-text', authController.handleBlockNonBots,
    storyController.content.handleGetText)
router.get('/get-key-passages', authController.handleBlockNonBots,
    storyController.content.handleGetKeyPassages)
router.get('/create-illustration', authController.handleBlockNonBots,
    storyController.content.handleCreateIllustration)
router.post('/create-collectible-assets', authController.handleBlockNonBots,
    uploadsFolder.single('collectibleGif'), storyController.content.handleCreateCollectibleAssets)
router.post('/create-story', authController.handleBlockNonBots,
    uploadsFolder.fields([
        { name: 'images' },
        { name: 'gif' },
        { name: 'mesh' },
        { name: 'blackSilhouette' },
        { name: 'whiteSilhouette' },
        { name: 'mainSilhouette' },
    ]), storyController.content.handleCreateStory)
router.delete('/delete-story', authController.handleBlockNonBots,
    storyController.content.handleDeleteStory)

export default router