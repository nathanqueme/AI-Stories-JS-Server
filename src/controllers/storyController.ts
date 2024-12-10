/**
 * storyController.ts
 * version 1.0.0
 * 
 * Created on the 29/01/2023
 */

import ERRORS_MSGS from '../errors'
import CONSTANTS from '../constants'
import axios from 'axios'
import { Request, Response } from 'express'
import { aws, openAI } from '../backend'
import {
    getLike, getLikes, getStories, getStory, getUsageData,
    incrementCreatedStoryCount, incrementReadCount, incrementStoryValue,
    likeStory, setItem, unlikeStory, getRecommendedStory,
    updateNestedValue, deleteItem, getCollectionPath
} from '../backend/firebase'
import { CollectibleAssetType, MediaFolderName, UsageValueType, VoiceNameType } from '../types'
import {
    Story, ApiResponse, StoryMedia, StoryMediaData, StoryData,
    LikeData, MonthlyUsage, MonthlyUsageData, UserActivity,
    InternalCompletionOutputData, StoryPromptData,
    IllustrationCreationParamsData
} from '../data'
import {
    isStringValid, getDataFormatParam, mergeStrings,
    getMaxParam, generateID, devtools, isArrayValid,
    getImageBuffer, extractImgFileNameAndFolders, getWords,
    getLocalFileBuffer, getSentences, groupSentencesIntoBatches
} from '../utils'
import {
    checkBotAccess, useUserAccess, imageProcessing,
    analyseAndExtractRichSentencesForIllustrationsV2,
    createStoryIllustration, watermarkGif, audioProcessing,
    createCollectibleAssets,
    storyUtils
} from '../services'
import { generateHMACSignature } from '../utils/functions/signatures'
import { updateGlobalMetricCount } from '../backend/firebase/firestore/globalMetric'
import { gcp } from '../backend/gcp'
import { firestoreDB } from '../backend/configs'

const main = {
    /** DECIDES OF HOW TO HANDLE THE REQUEST BASED ON THE PROVIDED PARAMS. */
    async handleGet(req: Request, res: Response) {


        // HANDLERS
        /**
         * - 1 - EXCTRACTS PARAMS and CHECK THEIR VALIDITY 
         * - 2 - GET STORY
         * - 3 - CHECK IF MORE STORIES CAN BE LOADED
         */
        async function handleGetStories(req: Request, res: Response) {

            // 1 - PARAMS
            const storiesJustForUser = (req.query.jfu === "true") || ((req.query.jfu as any) === true)
            const { user_id, user_ids, max_story_count, userExtraInfo: { sub_plan } } = await useUserAccess(req)
            const ids = storiesJustForUser && user_id ? [user_id] : user_ids
            if (storiesJustForUser && (!isStringValid(user_id)))
                return res.status(403).send(ERRORS_MSGS.FORBIDDEN)
            // OTHER PARAMS 
            const created_at = req.query.ca as string
            const max = getMaxParam(req, "story")
            const hl = req.query.hl as string
            const loadAfterCreatedAt = isStringValid(created_at) ? created_at : undefined
            const format = getDataFormatParam(req, 'e')
            const lc_data = req.query.lc as string
            var lc: number | null = null
            if (!storiesJustForUser) { // when storiesJustForUser === true, "lc" should not be sent to the API
                if (!isStringValid(lc_data)) return res.status(400).json(ERRORS_MSGS.INVALID_REQUEST)
                lc = parseInt(lc_data)
                const __lcs = req.query.__lcs
                const sever__lcs = generateHMACSignature(lc)
                // Compares the signature client created for the sensitive "lc" data with 
                // server's generated signature. If signatures are different the data was 
                // compromised and can't be trusted.
                if (__lcs !== sever__lcs) return res.status(400).json(ERRORS_MSGS.INVALID_REQUEST)
            }

            // LOGIC
            // 2 
            var stories: StoryData[] = []
            try {
                stories = await getStories(ids, max, loadAfterCreatedAt, hl, lc, max_story_count, undefined, undefined, sub_plan)
                stories = await Promise.all(stories.map(async (story) => {
                    return await Story.addUserUsage(story, user_id!)
                }))
            } catch (error) {
                console.log(error)
                return res.status(500).send(ERRORS_MSGS.STORY.GET_LIST_ERROR)
            }

            // 3
            var moreToLoad = false
            if ((stories.length === 0) || (stories.length < max)) {
                moreToLoad = false
            } else {
                const lastStory = stories[stories.length - 1]
                const max = 1
                const ca = lastStory.created_at
                const only_story_id = true
                moreToLoad = await getStories(ids, max, ca, hl, lc, max_story_count, only_story_id)
                    .then(responses => { return responses.length > 0 })
                    .catch(() => { return false })
            }

            // OUTPUT
            const moreToLoadData = { moreToLoad: moreToLoad }
            const apiResp1 = await ApiResponse.objectFrom(stories, format, "story")
            const apiResp2 = await ApiResponse.objectFrom(moreToLoadData, format, "other")
            res.send([apiResp1, apiResp2])

        }
        /** IN V1 : ANYONE HAVING THE URL POINTING TO A STORY CAN SEE IT. IN OTHER WORDS THERE IS NO SECURITY CHECKS / USAGE RESTRICITIONS ON A PER STORY BASIS.
         * 
         * - 1 - EXCTRACTS PARAMS and CHECK THEIR VALIDITY 
         * - 2 - GET MATCHING STORY IF ANY 
         */
        async function handleGetStory(req: Request, res: Response) {

            // 1 - PARAMS
            const id = req.query.id as string
            const hl = req.query.hl as string
            const format = getDataFormatParam(req, 'e')
            const { user_id, } = await useUserAccess(req)
            if (!isStringValid(id))
                return res.sendStatus(400)          // un-authenticated users can read stories 


            // LOGIC
            // 2 
            var story: StoryData | null = null
            try {
                story = await getStory(id, hl)
                if (story) story = await Story.addUserUsage(story, user_id!)
            } catch (error) {
                return res.status(500).send(ERRORS_MSGS.STORY.GET_ERROR)
            }


            // OUTPUT
            if (story) {
                const apiResp = await ApiResponse.objectFrom(story, format, "story")
                res.send(apiResp)
            } else {
                res.status(404).send(ERRORS_MSGS.STORY.NOT_FOUND)
            }

        }
        async function handleGetRecommendedStory(req: Request, res: Response) {

            // 1 - PARAMS
            // WARNING : any user has access to this function, so it could
            // allow anyone to scrape all reviews one by one.
            const ca = req.query.ca as string
            const hl = req.query.hl as string
            const format = getDataFormatParam(req, 'e')
            const { user_id, } = await useUserAccess(req)
            if (!isStringValid(ca))
                return res.sendStatus(400)          // un-authenticated users can have recommendations


            // 2 
            var story: StoryData | null = null
            try {
                var userIsAuthenticated = isStringValid(user_id); 
                story = await getRecommendedStory(ca, hl, userIsAuthenticated)
                if (story) story = await Story.addUserUsage(story, user_id!)
            } catch (error) {
                return res.status(500).send(ERRORS_MSGS.STORY.GET_ERROR)
            }


            // OUTPUT
            if (story) {
                const apiResp = await ApiResponse.objectFrom(story, format, "story")
                res.send(apiResp)
            } else {
                res.status(404).send(ERRORS_MSGS.STORY.NOT_FOUND)
            }

        }


        // PARAMS 
        const id = req.query.id;
        const ca = req.query.ca
        const rec = req.query.rec == "true"


        // LOGIC
        if (isStringValid(id)) {
            return handleGetStory(req, res);
        } else if (isStringValid(ca) && rec) {
            return handleGetRecommendedStory(req, res)
        }
        else {
            return handleGetStories(req, res);
        }

    },
    //
    // LIKE
    //
    //
    //
    //
    /**
    * - 1 - EXCTRACTS PARAMS and CHECK THEIR VALIDITY 
    * - 2 - GET LIKES
    * - 3 - GET STORY
    * - 4 - CHECK IF MORE LIKED STORIES CAN BE LOADED
    */
    async handleGetLikedStories(req: Request, res: Response) {

        // 1 - PARAMS
        const { user_id } = await useUserAccess(req)
        if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN)
        // OTHER PARAMS 
        const liked_at = req.query.la as string
        const max = getMaxParam(req, "story")
        const hl = req.query.hl as string
        const loadAfterLikedAt = isStringValid(liked_at) ? liked_at : undefined
        const format = getDataFormatParam(req, 'e')


        // 2
        var likes: LikeData[] = []
        try {
            likes = await getLikes(user_id, max, loadAfterLikedAt)
        } catch (error) {
            return res.status(500).send(ERRORS_MSGS.STORY.GET_LIKES_ERROR)
        }

        // 3
        var stories: StoryData[] = []
        try {
            const ids = likes.flatMap(el => { return el.item_id })
            stories = await getStories([user_id], max, undefined, hl, undefined, undefined, undefined, ids)
            stories = await Promise.all(stories.map(async (story) => {
                return await Story.addUserUsage(story, user_id!)
            }))
        } catch (error) {
            return res.status(500).send(ERRORS_MSGS.STORY.GET_LIST_BY_ID_ERROR)
        }
        const storiesSortedByLikedAt = likes
            .flatMap(l => {
                const story = stories.find(el => { return (el.id === l.item_id) })
                return story
            })
            .filter(el => { return el !== undefined }) as StoryData[]

        // 4
        var moreToLoad = false
        if ((likes.length === 0) || (likes.length < max)) {
            moreToLoad = false
        } else {
            const lastLike = likes[likes.length - 1]
            const max = 1
            const la = lastLike.liked_at
            // get likes by 
            moreToLoad = await getLikes(user_id, max, la)
                .then(responses => { return responses.length > 0 })
                .catch(() => { return false })
        }

        // OUTPUT
        const moreToLoadData = { moreToLoad }
        const apiResp1 = await ApiResponse.objectFrom(likes, format, "other")
        const apiResp2 = await ApiResponse.objectFrom(storiesSortedByLikedAt, format, "story")
        const apiResp3 = await ApiResponse.objectFrom(moreToLoadData, format, "other")
        res.send([apiResp1, apiResp2, apiResp3])

    },
    /** DECIDES OF HOW TO HANDLE THE REQUEST BASED ON THE PROVIDED PARAMS */
    async handleLikeOrUnlike(req: Request, res: Response) {

        async function handleLikeStory(req: Request, res: Response) {

            // 1 - PARAMS
            const { user_id } = await useUserAccess(req)
            if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)
            // OTHER PARAMS 
            const item_id = req.body.iid as string
            const format = getDataFormatParam(req, 'e')
            if (!isStringValid(item_id)) return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)


            // 2 - LOGIC
            var like: LikeData | null = null
            try {
                like = await likeStory(item_id, user_id)
            } catch (error) {
                return res.status(500).send(ERRORS_MSGS.STORY.LIKE_ERROR)
            }


            // OUTPUT
            if (like) {
                const apiResp = await ApiResponse.objectFrom(like, format, "other")
                res.send(apiResp)
            }
            else {
                res.status(404).send(ERRORS_MSGS.STORY.NOT_FOUND)
            }

        }
        async function handleUnlikeStory(req: Request, res: Response) {

            // 1 - PARAMS
            const { user_id } = await useUserAccess(req)
            if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)
            // OTHER PARAMS 
            const item_id = req.body.iid as string
            const format = getDataFormatParam(req, 'e')
            if (!isStringValid(item_id)) return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)


            // 2 - LOGIC
            var message: string = ""
            try {
                message = await unlikeStory(item_id, user_id)
            } catch (error) {
                return res.status(500).send(ERRORS_MSGS.STORY.UNLIKE_ERROR)
            }

            // OUTPUT
            const apiResp = await ApiResponse.objectFrom(message, format, "other") // -> not needed for real because don't has data 
            res.send(apiResp)

        }

        // PARAMS 
        const unlike = (req.body.ul === "true") || (req.body.ul === true)

        // LOGIC
        if (unlike) {
            return handleUnlikeStory(req, res);
        } else {
            return handleLikeStory(req, res);
        }

    },
    async handleGetStoryLike(req: Request, res: Response) {

        // 1 - PARAMS
        const { user_id } = await useUserAccess(req)
        if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)
        // OTHER PARAMS 
        const item_id = req.query.iid as string
        const format = getDataFormatParam(req, 'e')
        if (!isStringValid(item_id)) return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)


        // 2 - LOGIC
        var like: LikeData | null = null
        try {
            like = await getLike(item_id, user_id)
        } catch (error) {
            return res.status(500).send(error)
        }


        // OUTPUT
        //if (like) {
        const apiResp = await ApiResponse.objectFrom(like, format, "other")
        res.send(apiResp)
        //}
        //else {
        //res.status(404).send(ERRORS_MSGS.STORY.NOT_FOUND)
        //}

    },
    // 
    // 
    // 
    // 
    async handleIncrementStoryMetrics(req: Request, res: Response) {

        // 1 - PARAMS
        const { user_id } = await useUserAccess(req)
        const story_id = req.body.sid as string
        const metric = req.body.p as keyof StoryData
        const transaction = (req.body.t === "-") ? "-" : "+" // "+" by default
        const format = getDataFormatParam(req, 'e')
        if (!user_id) {
            // DON'T CAUSE GOOGLE CRAWLER TO CREATE HUNDREDS OF ERRORS WHEN THEY READ STORIES
            // INSTEAD SEND THIS VALID RESPONSE
            // EVEN IF NOTHING IS DONE
            const apiResp = await ApiResponse.objectFrom("Incrementation was ignored as user is not recognized", format, "other") // -> not needed for real because don't has data 
            return res.send(apiResp)
            // return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)
        }
        // THIS IS VERY IMPORTANT: BECAUSE IT'S "BAD" BUT "OK" FOR NOW IF HACKERS HAVE FUN 
        // CHANGING THE : like_count, read_count and share_count. BUT NOT THE REST.
        const isNotAllowedProperty = (metric !== "like_count") && (metric !== "read_count") && (metric !== "share_count")
        if (!isStringValid(story_id) || isNotAllowedProperty)
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)


        // 2 - LOGIC
        try {
            await incrementStoryValue(story_id, metric, transaction)
        } catch (error) {
            return res.status(500).send(ERRORS_MSGS.STORY.INCREMENTATION_ERROR)
        }

        // OUTPUT
        const apiResp = await ApiResponse.objectFrom("Value updated on story.", format, "other") // -> not needed for real because don't has data 
        res.send(apiResp)

    },
}

const media = {
    /** 
    * Generates or retrieves audio for a story. 
    * The audio is storie's text in the given voice.
    */
    async handleGetAudio(req: Request, res: Response) {

        // PARAMS
        const id = req.query.id as string
        const hl = req.query.hl as string
        const v = req.query.v as VoiceNameType
        // CHECKS
        if (!isStringValid(id) || !isStringValid(hl) || !isStringValid(v)) return res.sendStatus(400)
        if (hl !== "en") return res.sendStatus(400)

        // e.g. "audios/abc123/en/lily.mp3"
        const folderName: MediaFolderName = "audios",
            fileName = `${folderName}/${id}/${hl}/${v}.mp3`,
            audioFileURL = `https://cdn.minipixkids.com/${fileName}`
        // LOGS
        var logNames = { a: `✅ GENERATED all audio in`, c: "✅ concatenated in:", s3: "✅ saved to s3 in:" }

        const fileExists = await aws.S3.checkIfFileExists(fileName)
        // Call the S3 client to check if the object exists
        if (fileExists) {
            devtools.log("A: 1")
            res.json(audioFileURL)
        } else {
            // object does not exist yet
            devtools.log("A: 2")
            getStory(id, hl)
                .then(async (story) => {
                    if (!story) return res.sendStatus(500);
                    const text = mergeStrings(story.paragraphs) ?? "";

                    // STEP 1 - split
                    var sentences = getSentences(text),
                        maxBatchLength = 1000,
                        enforceMaxLength = true,
                        batches: string[] = groupSentencesIntoBatches(
                            sentences, maxBatchLength, enforceMaxLength)

                    // STEP 2 - create audio
                    try {
                        devtools.log("\n----< GENERATING ALL AUDIO >----"); devtools.time(logNames.a);
                        var audios = await Promise.all(batches.map(async (batch_text, idx) => {
                            var logName2 = `✅ audio n°${idx}`; devtools.time(logName2);
                            const audioBuffer = await gcp.getTextToSpeech(batch_text, v)
                            devtools.timeEnd(logName2)
                            return audioBuffer.audioContent as Buffer
                        }))
                        devtools.timeEnd(logNames.a)
                    } catch (error) {
                        console.log("ERROR WHILE GETTING AUDIOS (batch Text-to-Speech)");
                        console.log(error);
                        return res.sendStatus(500)
                    }

                    // STEP 3 - concatenate and save it
                    try {
                        devtools.time(logNames.c)
                        const concatenatedBuffer = await audioProcessing.concatenateAudioBuffers(audios)
                        devtools.timeEnd(logNames.c); devtools.time(logNames.s3)
                        // TODO: make it faster
                        // NOTE: This is STEP is so LONG! (about 1sec per 100kb) a
                        // story with a text of 4000 characters produces an audio file
                        // about 800 KB or 4 min of audio, which takes about 7 sec to 
                        // save
                        await aws.S3.putContent(        // avoids re-creating each time
                            concatenatedBuffer, fileName, "audio/mpeg"); devtools.timeEnd(logNames.s3)
                        res.json(audioFileURL)
                    } catch (error) { devtools.log(error); return res.sendStatus(500) }

                })
                .catch(err => { devtools.log(err); res.sendStatus(500) })

        }
    },
    async handleGetAlternateImagesColor(req: Request, res: Response) {

        // PARAMS 
        const imgURLS = req.query.iu as string[]
        const hexColor = req.query.c as string
        if (!isArrayValid(imgURLS) || !isStringValid(hexColor)) return res.sendStatus(400) // bad request


        var colorizedURLS: string[] = []
        try {
            // process images all at the same time for better speed 
            colorizedURLS = await Promise.all(imgURLS.map(async (imgURL) => {

                // "https://cdn.minipixkids.com/images_colorized/${story_id}/${paragraph_index}.jpg" to "/imags_colorized/${story_id}/${paragraph_index}.jpg"
                const { pathname } = new URL(imgURL)
                const filePath = pathname.replace("/", "") // removes first "/"
                const { folders, fileName } = extractImgFileNameAndFolders(filePath)
                const story_id = folders[1]
                const paragraph_index = fileName!.split(".")[0]!
                // "images_colorized/${story_id}/${hex_color}/${paragraph_index}.jpg"
                const colorizedImgFilename = StoryMedia.getFileName(story_id, paragraph_index, "images_colorized", hexColor)
                const colorizedImgURL = `https://cdn.minipixkids.com/${colorizedImgFilename}`

                // If image is already created just return it's url
                const fileExists = await aws.S3.checkIfFileExists(colorizedImgFilename)
                if (fileExists) {
                    devtools.log(`✅ image ${paragraph_index} already exists (in color ${hexColor})`)
                    return colorizedImgURL
                }
                // LOGS for devs to track speed
                const logNames = {
                    started: `coloring image ${paragraph_index} ...`,
                    loaded: `1/3 loaded original image ${paragraph_index} in`,
                    colored: `2/3 colored image ${paragraph_index} in`,
                    saved: `3/3 saved image ${paragraph_index} at ${colorizedImgFilename} in`,
                    ended: `🌈 image ${paragraph_index} colored into ${hexColor} in`,
                }
                console.log(logNames.started)
                console.time(logNames.ended)
                //    console.time(logNames.loaded)
                const imgBuffer = await getImageBuffer(imgURL) // get the image without color changes
                //    console.timeEnd(logNames.loaded)
                //    console.time(logNames.colored)
                const newImgBuffer = await imageProcessing.changeImageColor(imgBuffer, { hex: hexColor })
                //    console.timeEnd(logNames.colored)
                //    console.time(logNames.saved)
                // save to s3
                await aws.S3.putContent(newImgBuffer, colorizedImgFilename)
                //    console.timeEnd(logNames.saved)
                console.timeEnd(logNames.ended)
                return colorizedImgURL

            }))
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }

        res.sendStatus(200)

    },
    /** 
     * Generates a watermarked GIF of storie's badges
     * e.g. when user wants to share it with many people so the content is protected
     *      when it quits the platform
     */
    async handleGetWatermarkedGif(req: Request, res: Response) {

        // PARAMS 
        const url = req.query.u as string
        if (!isStringValid(url)) return res.sendStatus(400) // bad request

        try {
            const response = await axios.get(url, { responseType: 'arraybuffer', });
            const gifBuffer = Buffer.from(response.data);
            const gif = await watermarkGif(gifBuffer)
            res.set("Content-Type", "image/png")
            res.send(gif)
        } catch (error) {
            res.status(500).send(error)
        }
    },
}

const usage = {
    //
    // USAGE
    //
    //
    //
    //
    async handlePostUsage(req: Request, res: Response) {

        // 1 - PARAMS
        const { user_id } = await useUserAccess(req)
        const format = getDataFormatParam(req, 'e')
        if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)

        const usageValueType = req.body.uvt as UsageValueType
        if ((usageValueType !== "read-count") && (usageValueType !== "created-story-count"))
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)
        const hl = req.body.hl as string
        if ((usageValueType === "created-story-count") && !isStringValid(hl))
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)
        const story_id = req.body.sid as string
        if ((usageValueType === "read-count") && !isStringValid(story_id))
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)


        // CREATE DATA FOR FIRST TIME
        const date = new Date()
        const year = date.getUTCFullYear()
        const month = date.getUTCMonth() + 1 // +1 because .getUCTMonth() returns 0-11
        const id = MonthlyUsage.getID(user_id, year, month)


        var response = ""
        const updateFunction = usageValueType === "read-count"
            ? incrementReadCount(id)
            : incrementCreatedStoryCount(id, hl);

        try {
            response = await updateFunction
        } catch (error: any) {
            // err : {"code":5,"details":"No document to update: projects/ai-testing-65905/databases/(default)/documents/monthly-usages/documentid,"metadata":{},"note":"Exception occurred in retry method that was not classified as transient"}
            if (error?.code === 5) {
                // INITIALIZE DATA 
                var reads: any = {}
                var created_stories: any = {}
                const day = date.getUTCDate()
                if (usageValueType === "read-count") {
                    reads[day] = 1
                }
                else {
                    var day_count: any = {}; day_count[hl] = 1 // { "en": 1 }
                    created_stories[day] = day_count // { 10: { "en": 1 } }
                }
                var newMonthlyUsage = MonthlyUsage.object(id, month, year, user_id, reads, created_stories)

                // SAVE DATA 
                try {
                    response = await setItem(newMonthlyUsage, "monthly-usage")
                } catch (error) {
                    return res.status(500).send(ERRORS_MSGS.STORY.USAGE_DATA_ERROR)
                }

            } else
                return res.status(500).send(ERRORS_MSGS.STORY.USAGE_DATA_ERROR)

        }


        // SAVE THE INTERACTION AS WELL
        if (usageValueType === "read-count") {
            try {
                const nestedProp = `interactions.${story_id}`
                const resp = await updateNestedValue(user_id, nestedProp, "user-content-interaction", "incr")
            } catch (error: any) {
                // err : {"code":5,"details":"No document to update: projects/ai-testing-65905/databases/(default)/documents/monthly-usages/documentid","metadata":{},"note":"Exception occurred in retry method that was not classified as transient"}
                if (error?.code === 5) {
                    try {
                        const short_id = generateID(6)
                        var interactions: { [key: string]: any } = {}
                        interactions[story_id] = 1
                        var activity = UserActivity.object(user_id, short_id, interactions)
                        // save / init for first time
                        await setItem(activity, "user-content-interaction")
                    } catch (error) {
                        // return res.status(500).send(ERRORS_MSGS.STORY.USAGE_DATA_ERROR)
                    }
                } // else return res.status(500).send(ERRORS_MSGS.STORY.USAGE_DATA_ERROR)
            }
        }


        // OUTPUT
        const apiResp = await ApiResponse.objectFrom(response, format, "other") // -> not needed for real because don't has data 
        res.send(apiResp)

    },
    /**
     * - 1 - GET ALL THIS YEAR's USER's USAGE DATA 
     * - 2 - ADD DATA FOR MISSING MONTHS SO THE CLIENTS ALWAYS HAVE 12 MONTHS OF 
     *       USAGE DATA. (even if we are in january so there is only data for january)
     * - 3 - SORT ITEMS
    */
    async handleGetUsage(req: Request, res: Response) {

        // PARAMS 
        const { user_id } = await useUserAccess(req)
        if (!user_id) return res.status(403).send(ERRORS_MSGS.FORBIDDEN_ACCOUNT_NEEDED)
        const format = getDataFormatParam(req, 'e')
        const year = new Date().getUTCFullYear()

        // 1
        var monthlyUsages: MonthlyUsageData[] = []
        try {
            monthlyUsages = await getUsageData(user_id, year)
        } catch (error) {
            return res.status(500).send(ERRORS_MSGS.STORY.GET_USAGE_DATA_ERROR)
        }

        // 2
        var allMonthlyUsages: MonthlyUsageData[] = []
        var months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        months.forEach(month => {
            const monthlyUsage = monthlyUsages.find(el => { return el.month === month })
            if (monthlyUsage) {
                allMonthlyUsages.push(monthlyUsage)
            } else { // EMPTY DATA
                const id = MonthlyUsage.getID(user_id, year, month)
                const data = MonthlyUsage.object(id, month, year, user_id, {}, {})
                allMonthlyUsages.push(data)
            }
        })

        // 3 
        var allSortedMonthlyUsages = allMonthlyUsages
            .sort(function (a, b) { // Sort by chronologicaly
                if (a.month < b.month) { return -1 }
                if (a.month > b.month) { return 1 }
                return 0
            })


        // OUTPUT
        const apiResp = await ApiResponse.objectFrom(allSortedMonthlyUsages, format, "other")
        res.send(apiResp)

    },
}

const content = {
    utils: {
        /** 🟧 Throws an error if one asset is missing */
        extractCollAssetsFromReq(req: Request) {
            const files = req.files as { [key: string]: Express.Multer.File[] },
                gif = files['gif']?.[0] ?? null,
                mesh = files['mesh']?.[0] ?? null,
                blackSilhouette = files['blackSilhouette']?.[0] ?? null,
                whiteSilhouette = files['whiteSilhouette']?.[0] ?? null,
                mainSilhouette = files['mainSilhouette']?.[0] ?? null
            if ((gif === null) || (mesh === null) || (blackSilhouette === null) ||
                (whiteSilhouette === null) || (mainSilhouette === null))
                throw "❌ Missing collectible asset(s)"
            return { gif, mesh, blackSilhouette, whiteSilhouette, mainSilhouette }
        },
        /** POST or UPDATE a story's collectible assets (GIF and silhouettes) */
        async updateCollAssets(story_id: string, assets: {
            gif: Express.Multer.File
            mesh: Express.Multer.File
            blackSilhouette: Express.Multer.File
            whiteSilhouette: Express.Multer.File
            mainSilhouette: Express.Multer.File
        }) {

            async function uploadAsset(file: Express.Multer.File, asset_type: CollectibleAssetType) {
                const { path } = file, compress = false, buffer = await getLocalFileBuffer(path),
                    // fileName is overwritten to be always be correct:
                    { fileName, contentType } = StoryMedia.getCollectibleFileMetadata(story_id, asset_type)

                await aws.S3.uploadImage({ imageBuffer: buffer }, fileName, compress, contentType)
                return `✅ ${fileName} uploaded`
            }
            const queue = [
                async () => { await uploadAsset(assets.gif, "3D_anim") },
                async () => { await uploadAsset(assets.mesh, "mesh") },
                async () => { await uploadAsset(assets.mainSilhouette, "ms") },
                async () => { await uploadAsset(assets.blackSilhouette, "bs") },
                async () => { await uploadAsset(assets.whiteSilhouette, "ws") },
            ]
            // process each action at the same time to try to save time (may not be efficient)
            await Promise.all(queue.map(async func => await func()))
            return `✅ collectible n°${story_id} UPDATED/POSTED`
        },
        /** Deletes a story collectible */
        async deleteCollAssets(story_id: string) {
            const asset_types: CollectibleAssetType[] = ["3D_anim", "bs", "ms", "ws"]
            const fileNames = asset_types.flatMap(type => {
                const { fileName } = StoryMedia.getCollectibleFileMetadata(story_id, type);
                return fileName
            })
            await Promise.all(fileNames.map(async (fileName) => {
                await aws.S3.deleteContent(fileName)
            }))
            return `✅ collectible n°${story_id} DELETED`
        },
    },
    // step 1 
    async handleGetText(req: Request, res: Response) {
        // required param 
        const user_prompt = req.query.p as string
        // const create_text = (req.query.ct as string) == "true"
        if (!isStringValid(user_prompt)) return res.sendStatus(400) // bad request
        // options
        const temperature = Number(req.query.t ?? 0.7)
        const frequency_penalty = Number(req.query.fp ?? 0.4) // was 0 then 0.5
        const presence_penalty = Number(req.query.pp ?? 0)
        const max_tokens = 40 // was 200


        // 1 - GENERATE PROMPT
        var storyPrompt: StoryPromptData
        try {
            storyPrompt = await openAI.promptHandler.generateStoryPrompt(user_prompt)
        } catch (error) {
            console.log(error)
            return res.sendStatus(500)
        }


        // 2 - GENERATE STORY TEXT
        const { prompt } = storyPrompt
        // `text` is in english
        var text: string;
        var internalCompletionOutput: InternalCompletionOutputData = null as any
        text = "Enter text ..."
        /*
        try {
            const textCompletionResponse = await openAI.createCompletion(prompt, temperature, frequency_penalty, presence_penalty, max_tokens)
            text = textCompletionResponse.choices[0].text ?? ""
    
            // FOR DEVELOPMENT / LOCAL USAGE
            const completion = `${text}` // shallow copy
            const model = CONSTANTS.MODEL_CURIE_1
            const created_at = new Date().toISOString()
            const usage = textCompletionResponse.usage
            internalCompletionOutput = InternalCompletionOutput.object(completion, prompt, model, max_tokens, temperature, frequency_penalty, presence_penalty, created_at, usage)

        } catch (error) {
            console.log(error)
            return res.sendStatus(500)
        }
        */

        // send data 
        const output = {
            keywords: storyPrompt.keywords,
            text,
            debug: { storyPrompt, internalCompletionOutput }
        }
        res.json(output)
    },
    // step 2 
    handleGetKeyPassages(req: Request, res: Response) {
        // required
        const text = req.query.t as string,
            kws = req.query.kws as string[],
            max = req.query.max as string
        if (!isStringValid(text)) return res.sendStatus(400) // bad request
        const keywords = isArrayValid(kws) ? kws : []
        // options 
        const MAX_ILLUSTRATION_COUNT = isStringValid(max) ? Number(max) : 6

        const output = analyseAndExtractRichSentencesForIllustrationsV2(text, keywords, MAX_ILLUSTRATION_COUNT)
        res.json(output)
    },
    // step 3 
    async handleCreateIllustration(req: Request, res: Response) {
        // required
        const illustrationParams = req.query.ip as any as IllustrationCreationParamsData
        const generateImage = (req.query.gi as string) != "false"
        if (!isStringValid(illustrationParams.description)) return res.sendStatus(400) // 
        // options 
        const drawing_colors = "multicolor"
        try {
            const { description, sentence_index, paragraph_index } = illustrationParams
            const media_output = await createStoryIllustration(description, drawing_colors,
                Number(sentence_index), Number(paragraph_index), "url", "512x512",
                undefined, generateImage)
            const media = StoryMedia.objectFrom(media_output)
            // get buffer for client side ---------------
            // THIS IS NOT REQUIRED (IT IS JUST TO EASE THE WORK CLIENT SIDE)
            const response = await axios.get(media.data, { responseType: "arraybuffer" }),
                imageBuffer = Buffer.from(response.data, "binary"),
                imageBase64 = imageBuffer.toString("base64")
            // --------------------------------------------
            const output = {
                media,
                imageBase64,
            }
            res.json(output)
        }
        catch (error) {
            devtools.log(error)
            res.sendStatus(500)
        }
    },
    // step 4
    // NOTE - WARNING : BLACK OBJECTS ARE NOT SUPPORTED
    // If an object contains any black, HOLES will appear in the black areas 
    // (This function clears black pixels)
    async handleCreateCollectibleAssets(req: Request, res: Response) {

        // PARAMS 
        if (!req.file) return res.sendStatus(400);
        try {
            const idx = Number(req.body.silhouetteIndex)
            if ((idx > 19) || (idx < 0)) return res.sendStatus(400)
        } catch { return res.sendStatus(400) };
        const { path } = req.file;
        var silhouetteIndex = req.body.silhouetteIndex;
        if (!isStringValid(req.body.silhouetteIndex)) silhouetteIndex = 3;

        try {
            const gif = await getLocalFileBuffer(path)
            const assets = await createCollectibleAssets(gif, silhouetteIndex)

            // Convert Buffers to base64 
            const output = {
                gifBase64: assets.newGif.toString("base64"),
                silhouettesBase64: {
                    main: assets.silhouette.toString("base64"),
                    white: assets.white_silhouette.toString("base64"),
                    black: assets.black_silhouette.toString("base64"),
                },
            }
            res.json(output)

        } catch (error) {
            devtools.log(error)
            res.sendStatus(500)
        }
    },

    // last step
    async handleCreateStory(req: Request, res: Response) {

        // return res.send(Story.object("id", "user_id", "created_at", 2023, 1, ["test"], "title", "en", ["keywords"], [], 0, 0, 0, 0))


        // ---- CHECKING REQ ----
        // -> FILES
        var files = req.files as { [key: string]: Express.Multer.File[] },
            images = files["images"] ?? [], collAssets
        if (images.length < 1) return res.sendStatus(400)   // IMAGE(S) REQUIRED
        try {
            collAssets = content.utils.extractCollAssetsFromReq(req)
        } catch (error) {   // MISSING REQUIRED COLL ASSET(S) 
            devtools.log(error)
            return res.sendStatus(400)
        }
        // -> PARAMS 
        const bodyData = {
            title: req.body.title as string,
            paragraphs: [] as string[],
            keywords: [] as string[],
            media: [] as StoryMediaData[],
            collectible_name: req.query.collectible_name as string,
        }
        try {
            bodyData.paragraphs = JSON.parse(req.body.paragraphs)
            bodyData.keywords = JSON.parse(req.body.keywords)
            bodyData.media = JSON.parse(req.body.media)
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(400)
        }
        console.log(bodyData.title)     // -> prints an history of last created stories in the terminal
        const { title, paragraphs, keywords, media, collectible_name } = bodyData
        if (!isStringValid(title) || !isArrayValid(paragraphs) ||
            !isArrayValid(keywords) || !isArrayValid(media) || !isStringValid(collectible_name)
        ) return res.sendStatus(400)
        // SECURITY 
        const bot = await checkBotAccess(req).catch(err => { return undefined })
        if (!bot) return res.sendStatus(403)


        // UTILS 

        // 1 - Format story's data 
        const id = generateID(24),
            user_id = bot.bot_name,
            now = new Date(),
            created_at = now.toISOString(),
            year = now.getUTCFullYear(),
            month = now.getUTCMonth(),
            hl = "en",
            sorted_media = media.sort(function (a, b) { // sort by ascending
                if (a.paragraph_index < b.paragraph_index) { return -1 }
                if (a.paragraph_index > b.paragraph_index) { return 1 }
                return 0
            }),
            all_text = mergeStrings(paragraphs) ?? "",
            words = getWords(all_text, true),
            word_count = words.length,
            read_count = 0,
            share_count = 0,
            like_count = 0,
            min_reading_time = storyUtils.estimateMinReadingTime(all_text.length)


        // 2 - Save images 
        var savedImges
        try {
            savedImges = await Promise.all(sorted_media.map(async (el, index) => {
                // an url pointing to openai's outputs storage domain
                // const url = el.data
                // the buffer of the image (may be the same as or el.data)
                // or a version which has been modified using photoshop
                const { path } = images[index]
                const buffer = await getLocalFileBuffer(path)

                const fileName1 = StoryMedia.getFileName(id, el.paragraph_index)
                const fileName2 = StoryMedia.getFileName(id, el.paragraph_index, "images_uncompressed")
                await aws.S3.uploadImage({ imageBuffer: buffer }, fileName1)
                // saves a copy with the image in original quality / size
                await aws.S3.uploadImage({ imageBuffer: buffer }, fileName2, false)
                return { index: index, fileName: fileName1 }
            }))
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }
        const { CDN_URL } = CONSTANTS.URLS;
        var updatedMedia: StoryMediaData[] = savedImges.flatMap(el => {
            const imgUrl = `${CDN_URL}/${el.fileName}`
            // MEDIA WITH UP TO DATE URL (pointing to our storage bucket)
            var newMedia = Object.assign({}, sorted_media[el.index])
            newMedia.data = imgUrl
            return newMedia
        })


        // 3 - Post collectible
        try {
            await content.utils.updateCollAssets(id, collAssets)
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }


        // 4 - Save the data 
        const story = Story.object(id, user_id, created_at, year,
            month, paragraphs, title, hl, keywords, updatedMedia,
            word_count, read_count, share_count, like_count, collectible_name,
            min_reading_time, null),
            databaseFormatStory = Story.databaseFormat(story),
            queue = [
                () => setItem(databaseFormatStory, "story"),
                () => updateGlobalMetricCount("story", "incr")
            ]
        await Promise.all(queue.map(async doAction => {
            try { await doAction() } catch (error) { // ...
            }
        }))


        res.json(story)

    },
    async handleDeleteStory(req: Request, res: Response) {
        const id = req.query.id as string
        if (!isStringValid(id)) return res.sendStatus(400)


        // 1 - Delete story data
        var story: StoryData = ({} as any)
        try {
            const response = await getStory(id);
            if (response) story = response;
            await deleteItem({ id: id }, "story")
            // decrease story_count
            await updateGlobalMetricCount("story", "decr")
            // ... handle deleting translations too
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }

        // 2 - Delete all media from AWS (IMAGES, COLLECTIBLE, AUDIOS)
        try {
            await Promise.all(story.media.map(async (m) => {
                const fn1 = StoryMedia.getFileName(id, m.paragraph_index, "images")
                const fn2 = StoryMedia.getFileName(id, m.paragraph_index, "images_uncompressed")
                await aws.S3.deleteContent(fn1)
                await aws.S3.deleteContent(fn2)
            }))
            await content.utils.deleteCollAssets(id)
            const colorsFolder: MediaFolderName = "images_colorized",
                colorizedFolderName = `${colorsFolder}/${id}`,  // ALL story's IMAGES IN ALL COLORS 
                audiosFolder: MediaFolderName = "audios",
                audiosFolderName = `${audiosFolder}/${id}`      // ALL story's VOICES IN ALL LANGUAGES
            await aws.S3.deleteFolder(colorizedFolderName)
            await aws.S3.deleteFolder(audiosFolderName)
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }

        // 3 - Remove from people's likes
        const collection = getCollectionPath("like")
        try {
            const query = firestoreDB.collection(collection).where("item_id", "==", id)
            const response = await query.get();
            var docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = []
            response.forEach(el => {
                docs.push(el)
            })
            await Promise.all(docs.map(async (doc) => {
                await doc.ref.delete()
            }))
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }

        res.sendStatus(200)

    },
}

const storyController = {
    main,
    media,
    usage,
    content
}


export default storyController