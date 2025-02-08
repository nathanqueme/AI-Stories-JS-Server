/**
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

import { DecodedIdToken, UserRecord } from "firebase-admin/auth"
import {
    BotNameType, CollectibleAssetType, DataFormatType,
    MediaFolderName, ResourceType, SubscriptionPlanType,
    UserTagType, VoiceNameType
} from "../types"
import { devtools, isArrayValid, isStringValid, mergeStrings } from "../utils"
import { decrypt, serverSideEncryption } from "../utils/encryption"
import { getTranslation, setItem } from "../core/google-firebase/firestore"
import { createStoryTranslation } from "../lib"
import { db } from "../core"

// P.S.: All values that are "undefined" are transformed 
// to "null" so that firebase can save because firebase 
// does not supports undefined values.







// SERVER 
export interface BotData {
    bot_name: BotNameType
    iat: number
}






// DATABASE ONLY (used for representing the database)
export interface GlobalMetricData {
    collection: string
    count: number
    resource: ResourceType
}
export const GlobalMetric = {
    object(collection: string, count: number, resource: ResourceType) {
        return {
            collection: collection ?? null,
            count: count ?? null,
            resource: resource ?? null,
        }
    }
}



// DATABASE INTERACTION
export interface FirestoreUpdateData {
    id: string
    keyValues: { [key: string]: any }
}
// DATABASE INTERACTION
export const FirestoreUpdate = {
    object(id: string, keyValues: { [key: string]: any }) {
        return {
            id: id,
            keyValues: keyValues
        }
    }
}

// BACKEND
export interface WordNatureData {
    text: string,
    tags: string[]
}
export const WordNature = {
    object(text: string, tags: string[]) {
        return {
            text: text ?? null,
            tags: tags ?? null,
        }
    }
}

// BACKEND
export interface CompromiseLibraryNounsLookUpData {
    text: string
    terms: WordNatureData[] // <- As more data here
    // ... <- Also as more data here
}

// BACKEND
export interface WordToEmojiOutputData {
    word: string
    emoji: string
    unformatted_emoji: string
    usage: (number | string)[]
    prompt: string // SENSITIVE INFO
}
export const WordToEmojiOutput = {
    object(word: string, emoji: string, unformatted_emoji: string, usage: (number | string)[], prompt: string) {
        return {
            word: word ?? null,
            emoji: emoji ?? null,
            unformatted_emoji: unformatted_emoji ?? null,
            usage: usage ?? null,
            prompt: prompt,
        }
    }
}

// BACKEND
export interface SplittingOutputData {
    input: string,
    flattened_text: string,
    sentences: string[],
    well_splited_paragraphs: string[]
}
export const SplittingOutput = {
    object(input: string, flattened_text: string, sentences: string[], well_splited_paragraphs: string[]) {
        return {
            input: input ?? null,
            flattened_text: flattened_text ?? null,
            sentences: sentences ?? null,
            well_splited_paragraphs: well_splited_paragraphs ?? null,
        }
    }
}

// BACKEND
export interface SimilarityCheckData {
    keyword: string
    similar_word: string
    similarity: number
}
export const SimilarityCheck = {
    object(keyword: string, similar_word: string, similarity: number) {
        return {
            keyword: keyword ?? null,
            similar_word: similar_word ?? null,
            similarity: similarity ?? null,
        }
    }
}

// BACKEND
export interface SentenceRichnessData {
    sentence: string
    word_count: number
    similarities: SimilarityCheckData[]
    nouns_count: number
    nouns: string[]
    exact_match_count: number
    paragraph_index: number
    sentence_index: number
}
export const SentenceRichness = {
    object(sentence: string, word_count: number, similarities: SimilarityCheckData[], nouns_count: number, nouns: string[], exact_match_count: number, paragraph_index: number, sentence_index: number) {
        return {
            sentence: sentence ?? null,
            word_count: word_count ?? null,
            similarities: similarities ?? null,
            nouns_count: nouns_count ?? null,
            nouns: nouns ?? null,
            exact_match_count: exact_match_count ?? null,
            paragraph_index: paragraph_index ?? null,
            sentence_index: sentence_index ?? null,
        }
    }
}

// BACKEND
/**
 * @param prompt : The formatted user prompt used to get a story with the openai API. The prompt is in English for better results (may not be necessary anymore in the future).
 * @param user_prompt : The copple of words (about 10) the user has written.
 * @param hl: The language in which the user prompt is written.
 * @param words_nature: The nature of each word of the user prompt.
 * @param prompt_nouns_count : The number of nouns in user prompt.
 * @param prompt_nouns : The nouns in user prompt.
 * @param emojis: The emojis of the prompt_nouns.
 */
export interface StoryPromptData {
    prompt: string
    user_prompt: string
    hl: string
    prompt_nouns_count: number
    prompt_nouns: WordNatureData[]
    keywords: string[]
    // emojis: { [noun: string]: string; }
}
export const StoryPrompt = {
    /**
     * @param prompt : The formatted user prompt used to get a story with the openai API. The prompt is in English for better results (may not be necessary anymore in the future).
     * @param user_prompt : The copple of words (about 10) the user has written.
     * @param hl: The language in which the user prompt is written.
     * @param words_nature: The nature of each word of the user prompt.
    */
    object(prompt: string, user_prompt: string, hl: string, prompt_nouns_count: number, prompt_nouns: WordNatureData[], keywords: string[]) {
        return {
            prompt: prompt ?? null,
            user_prompt: user_prompt ?? null,
            hl: hl ?? null,
            prompt_nouns_count: prompt_nouns_count ?? null,
            prompt_nouns: prompt_nouns ?? null,
            keywords: keywords ?? null,
            // emojis: emojis
        }
    }
}

// BACKEND
export interface IllustrationCreationParamsData {
    sentence: string
    description: string
    sentence_index: number
    paragraph_index: number
}
export const IllustrationCreationParams = {
    object(sentence: string, description: string, sentence_index: number, paragraph_index: number) {
        return {
            sentence: sentence ?? null,
            description: description ?? "", // "" not null
            sentence_index: sentence_index ?? null,
            paragraph_index: paragraph_index ?? null,
        }
    }
}

// BACKEND
export interface StoryMediaCreationOutputData {
    data: string
    description: string
    color: string
    prompt: string // TO REMOVE ON CLIENT (ONLY FOR DEBUGGING / SENSITIVE INFORMATION)
    size: string
    sentence_index: number
    paragraph_index: number
    type: "image/jpeg"
}
export const StoryMediaCreationOutput = {
    object(data: string, description: string, color: string, prompt: string, size: string, sentence_index: number, paragraph_index: number, type: "image/jpeg") {
        return {
            data: data ?? null,
            description: description ?? null,
            color: color ?? null,
            prompt: prompt ?? null,
            size: size ?? null,
            sentence_index: sentence_index ?? null,
            paragraph_index: paragraph_index ?? null,
            type: type ?? "image/jpeg",
        }
    },
}

// BACKEND 
export interface StoryTranslationData {
    id: string // story_id - hl
    hl: string
    title: string
    paragraphs: string[]
    keywords: string[]
    collectible_name: string
}
export const StoryTranslation = {
    object(id: string, hl: string, title: string, paragraphs: string[], keywords: string[], collectible_name: string) {
        return {
            id: id ?? null,
            hl: hl ?? null,
            title: title ?? null,
            paragraphs: paragraphs ?? null,
            keywords: keywords ?? null,
            collectible_name: collectible_name ?? null,
        }
    },
    /** e.g. returns `story123##en` */
    getId(story_id: string, hl: string) {
        const id = `${story_id}##${hl}`
        return id
    }
}

// BACKEND
export interface UserActivityData {
    id: string
    short_id: string
    interactions: { [story_id: string]: number }
}
// LINK #collaborative_filtering
// TODO will be used for collaborative filtering and designing a recommendation system
export const UserActivity = {
    /** 
     * @param     id                user's id. (user_id) 
     * @param     interactions      object containing the ids of stories user read
     */
    object(id: string, short_id: string, interactions: { [story_id: string]: number }) {
        return {
            id: id ?? null,
            short_id: short_id ?? null,
            // ANCHOR[id=user-activity-data]
            interactions: interactions ?? null
        }
    }
}










// BACKEND 
export const firebaseDataFormatter = {
    // REMOVE NESTED ARRAY FOR FIREBASE FIRESTORE
    /**
     * - TRANSFORMS [[1,2,3,"text"], [4,5,6,"emoji"]] 
     * - TO [{0: [1,2,3,"text"]}, {1: [4,5,6,"emoji"]}]
     */
    formatNestedArray(arr: any) {
        var output: any = {}
        arr?.forEach((item: any, index: number) => {
            output[index] = item
        })
        return output
    },
    // DEFORMAT NESTED ARRAY FROM FIREBASE FIRESTORE
    /**
    * - TRANSFORMS [{0: [1,2,3,"text"]}, {1: [4,5,6,"emoji"]}] 
    * - TO [[1,2,3,"text"], [4,5,6,"emoji"]]
    */
    deformatNestedArray(arr: any) {
        var output: any = []
        Object.keys(arr)?.forEach((key) => {
            output.push(arr[key])
        })
        return output
    }
}

export const dataFormatter = {
    /** Formats data by removing keys and maping values into an array.
      * 
      * @param data : the deformatted DATA object. e.g.: `{ "word": "blue", "emoji": "🟦", "description": null }`
      * @returns the formatted data. e.g.: `["blue", "🟦", null]`
      *  
      * WARNING: DOES NOT SUPPORTS NESTED DATA. 
     */
    format(data: { [key: string]: any }) {
        const keys = Object.keys(data)
        const formatted_data: any[] = keys?.map((key) => {
            const value = data[key]
            return value
        })
        return formatted_data
    },
    /** 
     * - Converts : `[ { word: "blue", emoji: "🔵" }, { word: "green", emoji: "🟢" } ]`
     * - Into : `[["blue", "🔵"], ["green", "🟢"]]`
     */
    formatArray(itemsOfData: { [key: string]: any }[]) {
        return itemsOfData?.map(dataItem => { return this.format(dataItem) })
    },
    /** Deformats formatted data by re-adding the KEYS to the VALUES, accordingly to the original DATA object.
     * 
     * @param formatted_data : the formatted data's values. e.g.: `["blue", "🟦", null]`
     * @param keys: the keys of the original data object. e.g.: `["word", "emoji", "description"]`
     * @returns the original data according to the provided keys. e.g.: `{ "word": "blue", "emoji": "🟦", "description": null }`
     *  
     * WARNING: DOES NOT SUPPORTS NESTED DATA. 
    */
    deformat(formatted_data: any[], keys: string[]) {
        var deformatted_data: { [key: string]: any } = {}
        formatted_data?.forEach((value, index) => {
            const key = (keys.length - 1) >= index ? keys[index] : null
            if (key === null) {// THIS VALUE MAY HAVE BEEN REMOVED/DEPRECATED FROM THE ORIGINAL DATA OBJECT.
                console.log(`🟨 ️ERROR (deformatting): no KEY FOUND for ${typeof value}`)
                return
            }
            deformatted_data[key] = value
        })
        return deformatted_data
    },
    /** 
    * - Converts : `[["blue", "🔵"], ["green", "🟢"]]`
    * - Into : `[ { word: "blue", emoji: "🔵" }, { word: "green", emoji: "🟢" } ]`
    */
    deformartArray(formatted_data: any[], keys: string[]) {
        return formatted_data?.map(dataItem => { return this.deformat(dataItem, keys) })
    }
}












// CLIENT FIENDLY 
export interface ApiResponseData {
    r: any
    f: DataFormatType
}
export const ApiResponse = {
    /**
     * 
     * @param {any} r : the `response`
     * @param {format} f : the `format`
     * @returns 
     */
    object(r: any, f: DataFormatType) {
        return {
            r: r ?? null,
            f: f ?? null
        }
    },
    // BACKEND 
    /** 
    * - FORMATS `STORY DATA` FOR CLIENT: 
    * - 1 - no changes 
    * - 2 - change data : 
    *   - 2.A - Formats data (removes the keys)
    *   - 2.B - Encrypts data so it can't be understood from a Browser console. e.g.: Chrome DevTools.
    *
    * - WARNING : 
    *   - ONLY KNOWS HOW FLATTEN DATA (resource) of type "story"
    * @param {ResourceType} resource
    */
    async objectFrom(responseData: any | any[], format: DataFormatType, resource: "story" | "other") {
        var apiResp: ApiResponseData | null = null
        switch (format) {
            // 1 - natural form
            case 'n-f': apiResp = ApiResponse.object(responseData, format); break;
            // 2 - change data 
            case 'f':
                var formattedData
                switch (resource as ResourceType) {
                    case 'story':
                        const isArray = isArrayValid(responseData)
                        if (isArray) {
                            formattedData = (responseData as StoryData[]).map(el => {
                                return Story.format(el)
                            })
                        } else {
                            formattedData = Story.format(responseData)
                        }
                        break;
                    // case '': 
                    // case '': 
                    // HANDLE OTHER RESOURCES ...
                }
                if (formattedData) {
                    apiResp = ApiResponse.object(formattedData, "f")
                } else apiResp = ApiResponse.object(responseData, "n-f")
                break;
            case 'e':
                // 2.B - encrypted
                apiResp = await ApiResponse.serverSideEncryptedObject(responseData, "n-f")
                break
        }
        return apiResp as ApiResponseData
    },
    // BACKEND
    async serverSideEncryptedObject(data: any, formatFallback: DataFormatType) {
        var encryptedData
        var format = formatFallback
        try {
            encryptedData = await serverSideEncryption(data)
            format = "e"
        } catch (error) { // DATA CAN'T BE ENCRYPTED BY THE SERVER
            encryptedData = data
        }
        return this.object(encryptedData, format)
    },
    // USER FRIENDLY
    /** 
     * - GET `DATA` BACK TO IT'S `natural-form` IF NOT ALREADY.
     * - BY REVERSESING `this.objectFrom`
     * @param {ResourceType} resource
     */
    async objectOutOf(apiResponse: ApiResponseData, resource: "story" | "other") {
        const { f: format, r: response } = apiResponse
        var responseData
        switch (format) {
            case 'n-f': responseData = response; break
            case 'f':
                var unformattedData
                switch (resource as ResourceType) {
                    case 'story':
                        const isArray = isArrayValid(response[0]) // when false response[0] is a string (storys' ID)
                        if (isArray) {
                            unformattedData = (response as any[][]).flatMap(el => {
                                return Story.deformat(el)
                            })
                        } else {
                            unformattedData = Story.deformat(response)
                        }
                        break;
                    // case '': 
                    // case '': 
                    // HANDLE OTHER RESOURCES ...
                    default: unformattedData = response
                }
                responseData = unformattedData
                break;
            case 'e':
                const naturalFormApiResp = await ApiResponse.decryptedObject(apiResponse, "n-f")
                responseData = naturalFormApiResp.r
                break
        }
        return responseData as any[] | any
    },
    // USER FRIENDLY
    async decryptedObject(encrypted_api_res: ApiResponseData, original_format: DataFormatType) {
        // CHECK THAT INPUT DATA IS VALID (can be encrypted)
        if (encrypted_api_res.f === "e") {
            var decrpted_response = await decrypt(encrypted_api_res.r)
            return this.object(decrpted_response, original_format)
        } else return encrypted_api_res
    }
}


export interface KeywordData {
    text: string,
    emoji: string | null
}
export const Keyword = {
    object(text: string, emoji: string | null) {
        return {
            text: text ?? null,
            emoji: emoji ?? null
        }
    },
    keys() {
        /** @ts-ignore */ // <-  REQUIRED SO THAT TYPESCRIPT DOES NOT THROWS AN ERROR
        const keys: string[] = Object.keys(this.object())
        return keys
    }
}

export interface OpenAiUsageData {
    total_tokens: number
    completion_tokens: number
    prompt_tokens: number
}
export const OpenAiUsage = {
    object(total_tokens: number, completion_tokens: number, prompt_tokens: number, resource: string) {
        return {
            total_tokens: total_tokens ?? null,
            completion_tokens: completion_tokens ?? null,
            prompt_tokens: prompt_tokens ?? null,
            resource: resource ?? null
        }
    },
    keys() {

        /** @ts-ignore */
        const keys: string[] = Object.keys(this.object())
        return keys
    }
}


export interface StoryMediaData {
    data: string
    description: string
    color: string
    size: string
    sentence_index: number
    paragraph_index: number
    type: "image/jpeg"
}
export const StoryMedia = {
    object(data: string, description: string, color: string, size: string, sentence_index: number, paragraph_index: number, type: "image/jpeg") {
        return {
            data: data ?? null,
            description: description ?? null,
            color: color ?? null,
            size: size ?? null,
            sentence_index: sentence_index ?? null,
            paragraph_index: paragraph_index ?? null,
            type: type ?? null,
        }
    },
    getFileName(story_id: string, paragraph_index: number | string,
        folder: MediaFolderName = "images", hexColor?: string) {
        const fileName = `${folder}/${story_id}${hexColor ? `/${hexColor.replace("#", "")}` : ""}/${paragraph_index}.jpg`
        return fileName
    },
    /** 
     * Provides the fileName and contentType based on the asset's type.
     * e.g. "3D_anim" gives the filename "collectibles/story123/3D_anim.gif"
     */
    getCollectibleFileMetadata(story_id: string, asset_type: CollectibleAssetType) {
        const folder: MediaFolderName = "collectibles",
            isGif = (asset_type === "3D_anim"),
            isMesh = (asset_type === "mesh"),
            fileExtension = isGif ? ".gif" : (isMesh ? ".ply" : ".png"),
            contentType = isGif ? "image/gif" : (isMesh ? "application/octet-stream" : "image/png"),
            fileName = `${folder}/${story_id}/${asset_type}${fileExtension}`
        return { fileName, contentType, fileExtension }
    },
    // BACKEND
    /**
     * - -> Formats a `StoryMediaCreationOutputData` to obtain a `StoryMediaData`. 
     */
    objectFrom(backend_data: StoryMediaCreationOutputData) {
        const {
            data,
            description,
            color,
            size,
            sentence_index,
            paragraph_index,
            type,
        } = backend_data
        return this.object(data, description, color, size, sentence_index, paragraph_index, type)
    },
    keys() {
        
        /** @ts-ignore */ 
        const keys: string[] = Object.keys(this.object())
        return keys
    }
}

export interface StoryUserUsageData {
    scrolling_progress: number
    reading_time_progress: number
    collectible_unlocked: boolean
    user_read_count: number
    last_read_at?: string | null
    first_read_at?: string | null
}
/** Used as a fallback when no data is available */
const default_user_usage: StoryUserUsageData = {
    scrolling_progress: 0,
    reading_time_progress: 0,
    collectible_unlocked: false,
    user_read_count: 0,
    last_read_at: null,
    first_read_at: null,
}
export interface StoryData {
    id: string
    user_id: string
    created_at: string
    year: number
    month: number
    paragraphs: string[]
    title: string
    hl: string
    keywords: string[]
    // media: ILLUSTRATIONS but later could also be VIDEOS and SOUNDS
    media: StoryMediaData[]
    word_count: number
    read_count: number
    share_count: number
    like_count: number
    // 
    collectible_name: string
    min_reading_time: number
    // USER BASED  (added AFTER DB query & BEFORE sent to client)
    user_usage: StoryUserUsageData | null
}
export const Story = {
    object(id: string, user_id: string, created_at: string, year: number,
        month: number, paragraphs: string[], title: string,
        hl: string, keywords: string[], media: StoryMediaData[], word_count: number,
        read_count: number, share_count: number, like_count: number, collectible_name: string,
        min_reading_time: number, user_usage: StoryUserUsageData | null) {
        return {
            id: id ?? null,
            user_id: user_id ?? null,
            created_at: created_at ?? null,
            year: year ?? null,
            month: month ?? null,
            paragraphs: paragraphs ?? null,
            title: title ?? null,
            hl: hl ?? null,
            keywords: keywords ?? null,
            media: media ?? null,
            word_count: word_count ?? null,
            read_count: read_count ?? null,
            share_count: share_count ?? null,
            like_count: like_count ?? null,
            collectible_name: collectible_name ?? null,
            min_reading_time: min_reading_time ?? null,
            user_usage: user_usage ?? null,
        }
    },
    // BACKEND
    /** Injects the translation into the story */
    fromTranslation(story: StoryData, translation: StoryTranslationData) {
        var storyTranslated = Object.assign({}, story)
        const { paragraphs, keywords, title, collectible_name } = translation
        storyTranslated.paragraphs = paragraphs
        storyTranslated.keywords = keywords
        storyTranslated.title = title
        storyTranslated.collectible_name = collectible_name
        // This would also work: 
        // translation.id.split("##")[1] // "abc123-en" -> "en"
        // But it is easier to lead to mistakes for instance if the way the id is created changes.
        storyTranslated.hl = translation.hl
        return storyTranslated
    },
    // BACKEND
    /** 
     * Translates the story if needed, otherwise returns input's story 
     * RETURNS THE STORY IN THE REQUESTED LANGUAGE IF NOT ALREADY.
     * - A : USE ALREADY CREATED TRANSLATION (READ ONLY)
     * - B : CREATE TRANSLATION (CREATE and WRITTE on DB)
     */
    async translated(story: StoryData, target_hl?: string | null) {
        const translationNeeded =
            (isStringValid(target_hl)) && target_hl && (story.hl !== target_hl)
        if (translationNeeded) {
            try {
                var translation = await getTranslation(story.id, target_hl)

                // there is a current translation ?
                if (!translation) {
                    const { paragraphs, title, keywords, hl: story_hl,
                        id: story_id, collectible_name } = story
                    const paragraphs_text = mergeStrings(paragraphs) ?? ""
                    // CREATE 
                    translation = await createStoryTranslation(paragraphs_text, keywords,
                        title, collectible_name, story_hl, target_hl, story_id, paragraphs.length)
                    // SAVE on DB
                    await setItem(translation, "translation").catch(error => { })
                    devtools.log(`Translation created (${story.id}) "${story.title.slice(0, 20)}..." ${story.hl} -> ${target_hl}`)

                } else if (translationNeeded) {
                    devtools.log(`Translation used (${story.id}) "${story.title.slice(0, 20)}..." ${story.hl} -> ${target_hl}`)
                } else
                    devtools.log(`Translation not needed (${story.id}) "${story.title.slice(0, 20)}..." ${story.hl} -> ${target_hl}`)


                story = Story.fromTranslation(story, translation)
                return story
            } catch (error) {
                return story
            }
        } else {
            // if (LOGS) { console.log(`\nTranslation not needed : ${story.id} "${story.title.slice(0, 20)}..."`) }
            return story
        }
    },
    // TODO DEPRECATE THIS
    // Nested data must be formatted by hand.
    format(story: StoryData) {
        const {
            id,
            user_id,
            created_at,
            year,
            month,
            paragraphs,
            title,
            hl,
            keywords,
            media,
            word_count,
            read_count,
            share_count,
            like_count,
            collectible_name,
            min_reading_time,
            user_usage,
        } = story
        const formatted_media = dataFormatter.formatArray(media) as any
        const story_with_formatted_data = this.object(id, user_id, created_at, year,
            month, paragraphs, title, hl, keywords, formatted_media, word_count,
            read_count, share_count, like_count, collectible_name,
            min_reading_time, user_usage)
        const formatted_story = dataFormatter.format(story_with_formatted_data)
        return formatted_story
    },
    deformat(formatted_story: any[]) {
        var story_semi_deformatted = dataFormatter.deformat(formatted_story, this.keys()) as StoryData
        const deformatted_media = dataFormatter.deformartArray(story_semi_deformatted.media, StoryMedia.keys()) as any

        story_semi_deformatted["media"] = deformatted_media

        return story_semi_deformatted
    },
    databaseFormat(story: StoryData) {
        const {
            id,
            user_id,
            created_at,
            year,
            month,
            paragraphs,
            title,
            hl,
            keywords,
            media,
            word_count,
            read_count,
            share_count,
            like_count,
            collectible_name,
            min_reading_time,
        } = story

        // 1 - FORMAT ARRAYS
        // usage is already formatted
        const formatted_media = dataFormatter.formatArray(media) as any[][]

        // 2 - CONVERT FORMATTED ARRAYS INTO FIREBASE FRIENDLY DATA
        const formatted_media_map = firebaseDataFormatter.formatNestedArray(formatted_media)

        // OUTPUT
        // NOTE THAT user_usage is voluntarly not present here 
        var databaseFormatData = this.object(id, user_id, created_at, year, month, paragraphs,
            title, hl, keywords, formatted_media_map, word_count, read_count, share_count,
            like_count, collectible_name, min_reading_time, null)
        // @ts-ignore
        delete databaseFormatData?.user_usage;
        return databaseFormatData
    },
    deformatDatabaseFormat(database_format_story: StoryData) {
        const {
            media: formatted_media_map,
        } = database_format_story

        // 1 - CONVERT FIREBASE FRIENDLY DATA (maps of arrays) INTO FORMATTED ARRAYS (nested arrays)
        const formatted_media = firebaseDataFormatter.deformatNestedArray(formatted_media_map)

        // 2 - DEFORMAT ARRAYS (remove nesting)
        const media = dataFormatter.deformartArray(formatted_media, StoryMedia.keys()) as any

        // OUTPUT
        var story = Object.assign({}, database_format_story) // -> shallow copy
        story.media = media
        return story
    },
    /** 
     * Fetches user's usage then adds it to the story. If no usage data is found fallback 
     * data is added.
     */
    async addUserUsage(story: StoryData, user_id: string) {
        const id = ReadingProgress.getId(user_id, story.id)
        const rp = await db.getItem(
            id, "reading-progress") as ReadingProgressData | undefined

        if (rp) {
            var storyUpdated: StoryData = {
                ...story, ...{
                    user_usage: {
                        scrolling_progress: rp.scrolling_progress,
                        reading_time_progress: rp.reading_time_progress,
                        collectible_unlocked: rp.collectible_unlocked,
                        user_read_count: rp.read_count,
                        last_read_at: rp.last_read_at,
                        first_read_at: rp.first_read_at,
                    }
                }
            }
            return storyUpdated
        }
        // WARNING
        // IF THIS GETS REMOVED THE app WILL CRASH 
        // -> clients expects non null values expect for `last_read_at` & `first_read_at`
        var storyFallback: StoryData = {
            ...story, ...{
                user_usage: default_user_usage
            }
        }
        return storyFallback
    },
    keys() {
       
        /** @ts-ignore */
        const keys: string[] = Object.keys(this.object())
        return keys
    },
}

export interface LikeData {
    id: string
    item_id: string
    user_id: string
    liked_at: string
}
export const Like = {
    object(id: string, item_id: string, user_id: string, liked_at: string) {
        return {
            id: id ?? null,
            item_id: item_id ?? null,
            user_id: user_id ?? null,
            liked_at: liked_at ?? null,
        }
    },
    /** 
     * @param item_id : the id of the liked item 
     * - e.g. returns `user123##xyz`
    */
    getID(item_id: string, user_id: string) {
        const id = `${user_id}##${item_id}`
        return id
    },
}

export interface MonthlyUsageData {
    id: string
    month: number
    year: number
    user_id: string
    reads: { [day: number]: number }
    created_stories: { [day: number]: { [hl: string]: number } } // array of "hl" language locales for each day
}
export const MonthlyUsage = {
    /** 
    * @param created_stories: is an object of `created_stories_count` for each `hl` language locales of each day.
    * - e.g. { 1: { "en": 2 }, 2: { "en": 2, "fr": 1 } }
    * - Explanation : the user created 2 stories in `English` the first day of the month 
    * and 3 stories next day, 2 in `English and 1 in French`.
    */
    object(id: string, month: number, year: number, user_id: string, reads: { [day: number]: number }, created_stories: { [day: number]: { [hl: string]: number } }) {
        return {
            id: id ?? null,
            month: month ?? null,
            year: year ?? null,
            user_id: user_id ?? null,
            reads: reads ?? null,
            created_stories: created_stories ?? null,
        }
    },
    /** 
    * @param item_id               The ID of the monthly usage.
    * - e.g. returns `user123##2023##11`
   */
    getID(user_id: string, year: number, month: number) {
        const id = `${user_id}##${year}##${month}`
        return id
    }
}


export interface ReadingProgressData {
    id: string
    user_id: string
    story_id: string
    last_read_at: string
    first_read_at: string
    read_count: number
    scrolling_progress: number
    reading_time_progress: number
    collectible_unlocked: boolean
}
export const ReadingProgress = {
    /**
    * @param id                    the item's unique ID made of the id + user_id.
    * @param user_id               the ID of the current user.
    * @param story_id              the story's ID.
    * @param last_read_at          the date in ISO format when the user last read the story.
    * @param first_read_at         the date in ISO format when user read the story for the first time.
    * @param read_count            the TOTAL quantity of times user read this story.
    * @param scrolling_progress    A value between 0 and 100 representing the percent of the story which 
    *                              user has scrolled throught.
    * @param reading_time_progress The time user spent reading this story in seconds.
    * @param collectible_unlocked  Wether the story's collectible has been unlocked. This can be for real
    *                              (scrolling_progress == 100 AND reading_time long enought) OR because
    *                              it was bought.
 */
    object(id: string, user_id: string, story_id: string, last_read_at: string,
        first_read_at: string, read_count: number, scrolling_progress: number,
        reading_time_progress: number) {
        return {
            id: id ?? null,
            user_id: user_id ?? null,
            story_id: story_id ?? null,
            last_read_at: last_read_at ?? null,
            first_read_at: first_read_at ?? null,
            read_count: read_count ?? null,
            scrolling_progress: scrolling_progress ?? null,
            reading_time_progress: reading_time_progress ?? null,
        }
    },
    keys() {
        /** @ts-ignore */
        const keys: string[] = Object.keys(this.object())
        return keys
    },
    /** 
     * @param user_id             
     * @param story_id              
     * - e.g. returns `user123##story123`
    */
    getId(user_id: string, story_id: string) {
        const id = `${user_id}##${story_id}`
        return id
    }
}







export interface UserExtraInfoData {
    hl: string
    hc: string
    sub_plan: SubscriptionPlanType
    sub_expired: boolean
    tag: UserTagType
    v: VoiceNameType
    score: number
}
export const UserExtraInfo = {
    // used to tag users. Can be used to deprecate a feature while keeping for tagged users.
    object(hl: string, hc: string, sub_plan: SubscriptionPlanType, sub_expired: boolean, tag: UserTagType, v: VoiceNameType, score: number) {
        return {
            hl: hl ?? null,
            hc: hc ?? null,
            sub_plan: sub_plan ?? null,
            sub_expired: sub_expired ?? null,
            tag: tag ?? null,
            v: v ?? null,
            score: score ?? null,
        }
    },
    /** RETURNS DEFAULT DATA IF NO VALUES SET. */
    async fromUser(user: UserRecord | DecodedIdToken | null | undefined) {

        // DEFAULT VALUES
        const COLORS = { clear: 'rgba(52, 52, 52, 0)', }
        var data: UserExtraInfoData = {
            hc: COLORS.clear,
            hl: "en",
            sub_plan: "trial-mode",
            sub_expired: false,
            tag: "launch-user",
            v: "lily",
            score: 0,
        }
        if (!user) return data
        var currentData: UserExtraInfoData | null = null


        try {
            const name = isStringValid(user?.displayName) ? user.displayName : (user as DecodedIdToken)?.name ?? ""
            const data = await JSON.parse(name)
            currentData = data
        } catch (error) {
        }
        if ((currentData === null)) return data

        try {
            const dataKeys = this.keys()
            dataKeys.forEach((key) => {
                const value = (currentData as any)[key]
                if (value) (data as any)[key] = value
            })
        } catch (error) {
        }
        return data

    },
    keys() {
        /** @ts-ignore */
        const keys: string[] = Object.keys(this.object())
        return keys
    }
}

