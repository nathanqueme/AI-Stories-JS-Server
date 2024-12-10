/**
 * openai.ts
 * version 1.0.0
 * 
 * Created on the 03/02/2023
 */

import { CreateCompletionResponse, CreateImageRequest, ListModelsResponse } from "openai"
import { PROMPTS, openAIApi } from "./configs"
import CONSTANTS from "../constants"
import nlp from "compromise/three"
import aws from "./aws"
import { CompromiseLibraryNounsLookUpData, dataFormatter, Keyword, StoryPrompt, StoryPromptData, WordNatureData, WordToEmojiOutput, WordToEmojiOutputData } from "../data"
import { getBestMatchingEmojis, isStringValid } from "../utils"
import { OpenaiImageFormatType, OpenaiImageSizeType } from "../types"



export const promptHandler = {
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
                const translated_noun = hl !== "en" ? await aws.translateText(noun, "en", hl) : noun
                var emojisData = getBestMatchingEmojis(noun)
                /* DEPRECATED 
                // Use a quick hack to get the Singular 
                // TODO: get the real Singular 
                if ((emojisData === null) && (noun.charAt(noun.length - 1) === "s")) {
                    var singular = noun.slice(0, noun.length - 1)
                    emojisData = getBestMatchingEmojis(singular)
                }
                const emoji = emojisData ? emojisData[0].emoji : null
                */
                // const keyword = Keyword.object(translated_noun, emoji)
                resolve(translated_noun)
            } catch (error) {
                reject(error)
            }
        })
    },
    /** Formats and provide data on user's prompt.
     * 
     * STEPS: 
     * - 1 - Formats user's prompt in order to generate a story with about 3 paragraphs (1 intro + descriptions + 1 outro) and about 800-900 characters (140-160 words).
     * - 2 - Detect the language in which the user prompt is written.
     * - 3 - Translate the user prompt into English if needed.
     * - 4 - Get most pertinent keywords. For now works by detecting nouns (so often: objects, 
     *       cities names, people's names, etc). Later could be more advanced and use
     *       word embeddings to detect the words which describe the most the story. So with the
     *       same meaning than the story, lexical fields, most frequency in the text. But a flexible and scalable 
     *       way meaning:
     *       - without even knowing if the word is a noun, an adjective, a verb,...
     *       - without even knowing what the story is about 
     *       - without even knowing if the word is at the plural, singular
     *       - without knowing if the verb is at the past present / the future
     *       - without knowing if the word is used directly/indirectly e.g. ("The cow" vs "A cow")
     *       ALSO STEP 4 SHOULD BE CODED SO IT WORKS FOR ANY TEXT NOT JUST STORIES. So this way the 
     *       code could be one day extracted and used for other products/ use cases. So a good way to 
     *       do that would be to create a folder with everything and call the code via a simple function
     *       called `getPertinentKeywords()`
     * - 5 (DEPRECATED) - Get nouns matching emojis if any in user language. (Translate back if needed.)
     * 
     * @param user_prompt : The copple of words (about 10) the user has written.
     */
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
     * - INTERNAL USAGE ONLY (only use it LOCALLY)
     * - Automatically generates a list of prompts which can then be used to generate a story.
    */
    generatePromptToGetStoriesPrompt(qty = 10) {
        return PROMPTS.STORY.CREATE_STORY_PROMPTS_V2.replace("{count}", String(qty))
    },
    wordToEmojiPrompt(word: string) {
        return PROMPTS.EMOJIS.WORD_TO_EMOJI_V1.replace("{word}", word)
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
    }
}


// TEXT RELATED 
/** 
 * - CALLS THE OPENAI API DIRECTLY (without any fine tuning). 
 * - -> So can do anything BUT requires a GOOD prompt (specific details and constraints to guide the AI).
 * 
 * LIMITATIONS: slower, more expensive (longer prompts), results may vary.
 * 
 * @param top_p: when not set to 1 stories tend to be very short and all the same.
 * @param frequency_penalty : controls how much the model should avoid repeating the same words or phrases in the generated text. Higher values of frequency penalty will encourage the model to use more diverse vocabulary and reduce the repetition of words or phrases.
 * @param frequency_penalty (values): 
 * - If you want to reduce repetition as much as possible, you can try setting the frequency_penalty to a high value, such as 0.9 or 1.0. This will discourage the AI model from repeating the same words or phrases too often, but it may also make the generated text less creative or natural-sounding.
 * - If you want to balance repetition reduction with creativity and coherence, you can try setting the frequency_penalty to a moderate value, such as 0.5 or 0.6. This will encourage the AI model to use a wider range of vocabulary and sentence structures, while still avoiding excessive repetition.
 * - If you want to prioritize creativity and novelty over repetition reduction, you can try setting the frequency_penalty to a low value, such as 0.1 or 0.2. This will allow the AI model to freely explore different language patterns and word choices, but it may also result in more repetition or less coherent text.
 * @param frequency_penalty (observations): increasing it tends to create short stories or stories that seem higly precise for instance with historical dates.
 * @param presence_penalty : works a censure. (Avoids the presence of certain words.)
 * @param max_tokens : was originally at 193, works really well but sometimes, the story can be shorter than wanted. Corresponds to the qty of tokens the completion will use so it excludes the ones from user prompt. (Could end up been more than max_token)
 * @param temperature : increasing the temperature tend to decrease the match between user prompt and the completion.  
*/
export function createCompletion(prompt: string, temperature = 0.7, frequency_penalty = 0, presence_penalty = 0, max_tokens = 200, top_p = 1, model = CONSTANTS.MODELS.OPENAI.CURIE_1) {
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

/** 
 * - Returns an emoji matching the given word. 
 * - Uses about 11-14 tokens in total on average (depending on the lenght of the prompt)
 * - Always uses 5 for the completion.
 */
export function getEmoji(word: string) {
    return new Promise<WordToEmojiOutputData | null>(async (resolve, reject) => {

        const prompt = promptHandler.wordToEmojiPrompt(word)
        try {
            const max_tokens = 5 + 1 // A succesfull response will output: \n\n🏝 (which requires 5 tokens)
            const model = CONSTANTS.MODELS.OPENAI.DAVINCI_3
            const response = await createCompletion(prompt, 0, 0, 0, max_tokens, 1, model)

            // OUTPUT
            if ((response.choices.length > 0) && (response.choices[0].text) && (response.usage)) {
                // "\n\n🏝"
                const unformatted_emoji = response.choices[0].text
                // potential emojis_array: [🏝, ❤️, 👥]
                const emojis_array = Array.from(unformatted_emoji).filter(e => { return e.match(CONSTANTS.REGEX.EMOJI) !== null })
                // emoji: "🏝"
                const emoji = emojis_array.length > 0 ? emojis_array[0] : null
                if (emoji) {
                    var usage = dataFormatter.format(response.usage)
                    const usage_resource = "emoji"; usage.push(usage_resource)
                    const output = WordToEmojiOutput.object(word, emoji, unformatted_emoji, usage, prompt)
                    resolve(output)
                }
                else {
                    resolve(null)
                }

            } else resolve(null)

        }
        catch (error) {
            reject(error)
        }

    })
}


// IMAGES RELATED
export function createImage(prompt: string, response_format: OpenaiImageFormatType = "url", size: OpenaiImageSizeType = "512x512") {
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


// DEVELOPMENT
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
// (unused)
function get4WordsForEmoji(word: string) {
    return new Promise(async (resolve, reject) => {
        const prompt = (process.env.DEVELOPMENT_EMOJI_DESCRIPTION ?? "").replace("{emoji}", word)
        const emoji = await createCompletion(prompt, 0.8, 0, 0, 30, 1, CONSTANTS.MODELS.OPENAI.DAVINCI_3)
        resolve(emoji.choices[0].text)
    })
}