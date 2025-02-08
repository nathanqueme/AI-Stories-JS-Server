/**
 * openai.ts
 * version 1.0.0
 * 
 * Created on the 03/02/2023
 */

import {
    CreateCompletionResponse,
    CreateImageRequest,
    ListModelsResponse
} from "openai"
import { PROMPTS, openAIApi } from "./clients"
import CONSTANTS from "../constants"
import nlp from "compromise/three"
import aws from "./aws"
import {
    CompromiseLibraryNounsLookUpData,
    StoryPrompt, StoryPromptData, WordNatureData,
} from "../models"
import { isStringValid } from "../utils/main"
import { OpenaiImageFormatType, OpenaiImageSizeType } from "../types"


export const promptHandler = {
    generateStoryPrompt(user_prompt: string) {
        return new Promise<StoryPromptData>(async (resolve, reject) => {

            // CHECK 
            if (!isStringValid(user_prompt)) return reject(`ERROR: Bad request, missing required parameter p.`)


            // 1 
            var formatted_prompt = user_prompt.trim()
            // Remove the dot at the end if any.
            if (formatted_prompt.lastCharacter() === ".") {
                formatted_prompt = user_prompt.trimLastCharacter()
            }


            // 2 
            let hl: string = "en"
            try {
                hl = await aws.getMainLanguageLocale(formatted_prompt)
            } catch (error) {
                return reject(`ERROR: could not get language.`)
            }


            // 3 
            if (hl !== "en") {
                try {
                    const translated_prompt = await aws.translateText(formatted_prompt, hl, "en")
                    var firstCharacter = translated_prompt.charAt(0); firstCharacter = firstCharacter.toLowerCase()
                    var otherCharacters = translated_prompt.slice(1)
                    formatted_prompt = `${firstCharacter}${otherCharacters}`
                } catch (error) {
                    return reject(`ERROR: could not translate.`)
                }
            } else console.log(`(#STEP 3') Translating into english ("en") NOT NEEDED`)


            // 4 
            var nounsOutputData = this.getNounsData(formatted_prompt)
            const keywords = await Promise.all(nounsOutputData.nouns.flatMap(async (noun) => {
                const keyword = await this.getKeywordData(noun, hl)
                return keyword
            }))


            // 5 
            // DEPRECATED


            // OUTPUT DATA
            const prompt = PROMPTS.STORY.CREATE_V2.replace("{formatted_prompt}", formatted_prompt)
            const storyPrompt = StoryPrompt.object(prompt, user_prompt, hl, nounsOutputData.nounsData.length, nounsOutputData.nounsData, keywords)
            resolve(storyPrompt)

        })
    },
    /** 
     * colors: a string with all colors separated by a comma. e.g.: "red, blue, green"
     */
    getOneLineDrawingPrompt(description: string, drawing_colors: string = "multicolor") {

        // FORMATTING DATA
        var formatted_description = description.trim()
        formatted_description = formatted_description.charAt(formatted_description.length - 1) === "." ? formatted_description.trimLastCharacter() : description

        // DEPRECATED (v3) ------------------------------
        // get the right article based on keyword's first letter
        // TODO: don't add an article if the keyword is a PROPER NOUN, PRONOUN, etc. (e.g.: "ibiza", "everyone")  
        // const article = (keyword.length > 0) ? (keyword.charAt(0).toLowerCase() === "a" || keyword.charAt(0).toLowerCase() === "e" || keyword.charAt(0).toLowerCase() === "i" || keyword.charAt(0).toLowerCase() === "o" || keyword.charAt(0).toLowerCase() === "u" ? "" : "a") : "a"
        // const article_and_keyword = article === "" ? keyword.toUpperCase() : `${article} ${keyword.toLowerCase()}`
        // remove the dot at the end if any. e.g.: `"Hi."` => `"Hi"` or `"Hi. "` => `"Hi"`
        // ----------------------------------------------

        // OUTPUT
        const prompt = PROMPTS.IMAGES.ONE_LINE_DRAWING_V4
            // was for V3: .replace("{article_and_keyword}", article_and_keyword)
            .replace("{description}", formatted_description)
            .replace("{lines_colors}", drawing_colors)
        return prompt
    },
    getWords(sentence: string) {
        /** Ignores extra whitespace "boys reading   books     on astronauts" becomes [ 'boys', 'reading', 'books', 'on', 'astronauts' ] */
        return sentence.split(" ").filter(w => { return w !== "" })
    },
    getWordsOfGivenNature(text: string, nature: "Noun" | "Adjective") {
        const wordsData: CompromiseLibraryNounsLookUpData[] = nlp(text).canBe(nature).json()
        var words: WordNatureData[] = [];
        wordsData.forEach((chunck) => {
            chunck.terms
                .filter((el) => { return !el.tags.includes("Pronoun") })
                .forEach((el) => { words.push({ text: el.text, tags: el.tags }) })
        })
        return words
    },
    // (TODO: improve with custom AI MODEL)
    getNounsData(text: string) {
        // Nouns tags: "Noun", "ProperNoun", "FirsName", "MaleNoun", "FemaleNoun", "Person"
        var nounsData = this.getWordsOfGivenNature(text, "Noun")
        // nouns = ["kid", "books", "book", "astronauts", "astronaut"] 
        // 1 - Nouns are both SINGULAR & PLURAL.
        // 2 - The nouns are always in English.
        var nouns = nounsData.flatMap(el => { return el.text })
        // Clean up by removing words that have been taken for nouns but which aren't 
        nouns = nouns.filter(noun => { return noun.length > 2 || ((noun.length === 2) && (noun === "tv")) })
        return { nouns: nouns, nounsData: nounsData }
    },
    /** 
     * - Returns the translation of the English noun in user's language
     * - (DEPRECATED) get a matching emoji if any. 
     */
    getKeywordData(noun: string, hl: string) {
        return new Promise<string>(async (resolve, reject) => {
            try {
                const translated_noun = hl !== "en" ?
                    await aws.translateText(noun, "en", hl) : noun
                resolve(translated_noun)
            } catch (error) {
                reject(error)
            }
        })
    },
}

export function createCompletion(
    prompt: string,
    temperature = 0.7,
    frequency_penalty = 0,
    presence_penalty = 0,
    max_tokens = 200,
    top_p = 1,
    model = CONSTANTS.MODELS.OPENAI.CURIE_1
) {
    return new Promise<CreateCompletionResponse>(async (resolve, reject) => {
        try {
            const completion = await openAIApi.createCompletion({
                model: model,
                prompt: prompt,
                max_tokens: max_tokens,
                temperature: temperature,
                top_p: top_p,
                frequency_penalty: frequency_penalty,
                presence_penalty: presence_penalty,
                n: 1,
                stop: "None",
            })
            resolve(completion.data)
        } catch (error) {
            reject(error)
        }
    })
}

export function createImage(
    prompt: string,
    response_format: OpenaiImageFormatType = "url",
    size: OpenaiImageSizeType = "512x512"
) {
    return new Promise<string | undefined>(async (resolve, reject) => {

        const params: CreateImageRequest = {
            prompt: prompt,
            response_format: response_format,
            size: size,
            n: 1,
        }

        try {
            const response = await openAIApi.createImage(params)
            const responseData = response?.data?.data
            const image_data = response_format === "url" ? responseData[0]?.url : responseData[0]?.b64_json
            resolve(image_data)
        } catch (error) {
            reject(error)
        }

    })
}

export function listModels() {
    return new Promise<ListModelsResponse>(async (resolve, reject) => {
        try {
            const response = await openAIApi.listModels()
            resolve(response.data)
        } catch (error) {
            reject(`ERROR: COULD NOT LIST MODELS ${error}`)
        }
    })
}
