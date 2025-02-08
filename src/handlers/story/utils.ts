/**
 * storyUtils.ts
 * version 1.0.0
 * 
 * Created on the 13/03/2023
 */

import stringSimilarity from 'string-similarity'

import ERRORS_MSGS from '../../errorsMessages'
import { aws, openAI } from '../../core'
import {
    IllustrationCreationParams, IllustrationCreationParamsData,
    StoryMediaCreationOutput, StoryMediaCreationOutputData,
    SentenceRichness, SentenceRichnessData, SimilarityCheck,
    SimilarityCheckData, StoryTranslation, StoryTranslationData
} from '../../models'
import { getWords, getSentences, getSourceParagraphIndex, mergeStrings } from '../../utils'
import { OpenaiImageFormatType, OpenaiImageSizeType } from '../../types'
import { gifProcessing, imageProcessing } from '../../lib'



/**
 * 
 * @param paragraphs_text : story's paragraphs flattened into a single string 
 * @param keywords : story's keywords
 * @param title : story's user propmt
 * @param story_hl : the human language the story is written into.
 * @param hl : the human language to translate the story into.
 */
export async function createStoryTranslation(
    paragraphs_text: string, keywords: string[],
    title: string, collectible_name: string, story_hl: string,
    hl: string, story_id: string, desired_paragraph_count: number) {
    return new Promise<StoryTranslationData>(async (resolve) => {

        var transation_queue: any[] = []
        transation_queue.push(paragraphs_text, keywords, title, collectible_name)
        var outputs = { paragraphs_text, keywords, title, collectible_name } // --> initialized to have fallbacks

        // LOGIC
        await Promise.all(transation_queue.map(async (el, index) => {
            try {
                switch (index) {
                    case 0:
                        outputs.paragraphs_text = await aws.
                            translateText(paragraphs_text, story_hl, hl)
                        break
                    case 1:
                        const keywordTranslations: { index: number, translation: string }[] = []
                        await Promise.all(keywords.map(async (k, index) => {
                            const translation = await aws.translateText(k, story_hl, hl)
                            const keywordTranslation = { index: index, translation: translation }
                            keywordTranslations.push(keywordTranslation)
                        }))
                        keywordTranslations
                            .sort(function (a, b) { // Sort by smallest index (asc)
                                if (a.index < b.index) { return -1 }
                                if (a.index > b.index) { return 1 }
                                return 0
                            }).forEach(el => {
                                outputs.keywords[el.index] = el.translation
                            })
                        break
                    case 2:
                        outputs.title = await aws.translateText(title, story_hl, hl)
                        break
                    case 3:
                        outputs.collectible_name = await aws.translateText(collectible_name, story_hl, hl)
                        break
                }
            } catch (error) {
                // handle translation error ...
            }
        }))

        // OUTPUT
        const paragraphs_sentences = 
            splitEquallyIntoParagraphs(outputs.paragraphs_text, desired_paragraph_count)
        const paragraphs = paragraphs_sentences.flatMap(p => { return mergeStrings(p) ?? "" })
        const id = StoryTranslation.getId(story_id, hl)
        const translation = StoryTranslation.
            object(id, hl, outputs.title, paragraphs, outputs.keywords, outputs.collectible_name)
        resolve(translation)

    })
}

export async function createStoryIllustration(description: string, drawing_colors: string, sentence_index: number, paragraph_index: number, response_format: OpenaiImageFormatType = "url", size: OpenaiImageSizeType = "512x512", overridePrompt = "", generateImage = true) {
    const prompt = overridePrompt !== "" ? overridePrompt : openAI.promptHandler.getOneLineDrawingPrompt(description, drawing_colors)
    try {
        // An image which asks to provide a local image (client side) instead of creating one here
        // this can be used if you already have an image
        const imageWithPlaceholder = "https://cdn.minipixkids.com/brand-resources/spread-hub-enter-photo.png"
        const image_data = generateImage ?
            await openAI.createImage(prompt, response_format, size)
            :
            imageWithPlaceholder
        if (image_data) {
            const result = StoryMediaCreationOutput.object(image_data, description, drawing_colors, prompt, size, sentence_index, paragraph_index, "image/jpeg")
            return result as StoryMediaCreationOutputData
        } else {
            throw (ERRORS_MSGS.OPENAI_RESPONSE_ERROR + " (one line drawing)")
        }
    } catch (error) {
        throw error
    }
}

/** Makes the GIF's background transparent and creates its silhouettes. */
export async function createCollectibleAssets(gif: Buffer, silhouetteIndex = 3) {
    // STEP 1: generates a new GIF without a black background (transparent)
    const transparentColor = "#00000000",      // used to remove the black background
        delay = 100,
        gifFrames = await gifProcessing.processGifFrames(gif, { hex: transparentColor }),
        imageBuffers = gifFrames.flatMap(el => { return el.buffer }),
        transparent = true
    const newGif = await gifProcessing.generateGif(imageBuffers, delay, transparent)

    // STEP 2: obtain the SILHOUETTE of the 3D object animated in the GIF.
    // 
    // A "Silhouette" is the term used to describe the image of a 3D collectible 
    // in its locked state (STORY NOT FULLY READ) (or preview state). The silhouette 
    // is all black and gives an idea of what the object looks like from the side.
    var silhouette = gifFrames[Number(silhouetteIndex)].buffer,
        // We use the 4th (3) image since it is on the side but not too
        // much. For some which are already on the side, use 8th (7) instead.
        blackColor = "#000000",
        whiteColor = "#ffffff",
        reducePixelation = true
    // One for BLACK and WHITE mode (UI)
    var black_silhouette: Buffer = null as any,
        white_silhouette: Buffer = null as any
    const queue = [
        async () => black_silhouette = await imageProcessing.changeAllPixelsColor(silhouette,
            { hex: blackColor }, reducePixelation),
        async () => white_silhouette = await imageProcessing.changeAllPixelsColor(silhouette,
            { hex: whiteColor }, reducePixelation),
    ]
    await Promise.all(queue.map(async func => await func()))

    const output = {
        newGif,
        silhouette,
        white_silhouette,
        black_silhouette,
    }
    return output
}





export function analyseAndExtractRichSentencesForIllustrationsV2(text: string, keywords: string[], desired_paragraph_count: number) {
    // 1 - spliting into paragraphs 
    const paragraphs_sentences = splitEquallyIntoParagraphs(text, desired_paragraph_count)
    const paragraphs = paragraphs_sentences.flatMap(p => { return mergeStrings(p) ?? "" })

    // 2.1 - analyse sentences richness
    var sentences_richness: { [paragraph_index: string]: SentenceRichnessData[]; } = {}
    paragraphs.forEach((paragraph, paragraph_index) => {
        const p_sentences = getSentences(paragraph)
        const previous_sentences_count = paragraphs.slice(0, paragraph_index).flatMap((p) => getSentences(p)).length
        var p_sentences_richness = p_sentences.flatMap((sentence, current_paragraph_sentence_index) => {

            // DATA
            const words = getWords(sentence, true)
            const nounsOutputData = openAI.promptHandler.getNounsData(sentence)
            const word_count = words.length
            const nouns = nounsOutputData.nouns
            const nouns_count = nouns.length
            const paragraph_index = getSourceParagraphIndex(sentence, paragraphs)
            // sentence_index: Global index of the sentence in the whole text
            // NOTE: WITH THIS CODE THE ALGORITHM INDEXES EACH SENTENCE AS A UNIQUE ONE (EVEN IF IS MORE THAN ONCE IN THE PARAGRAPH)
            // "Sent A", "Sent B", "Sent A" => { "Sent A", index: 0 }, { "Sent B", index: 1 }, { "Sent A", index: 2 }
            const sentence_index = previous_sentences_count + current_paragraph_sentence_index

            // SIMILARITY ANALYSIS - DATA
            const similarities_with_kws = keywords.flatMap((kw) => {
                const similarities_with_kw = words
                    .flatMap((w) => {
                        const w2 = w.toLowerCase().replace("'s", "")
                        const similarity = stringSimilarity.compareTwoStrings(kw, w2)
                        return SimilarityCheck.object(kw, w2, similarity)
                    })
                    // .filter(el => { return el.similarity !== 0 })
                    .filter(el => { return el.similarity > 0.5 })
                return similarities_with_kw
            }).sort(function (a, b) { // Sort by most similar
                if (a.similarity > b.similarity) { return -1 }
                if (a.similarity < b.similarity) { return 1 }
                return 0
            })
            const exact_match_count = similarities_with_kws.filter(el => { return el.similarity === 1 }).length

            // OUTPUT 
            var sentence_richness = SentenceRichness.object(sentence, word_count, similarities_with_kws, nouns_count, nouns, exact_match_count, paragraph_index, sentence_index)
            return sentence_richness
        })
        // OUTPUT
        sentences_richness[paragraph_index] = p_sentences_richness
    })

    // 2.2 - get each paragraph's best sentence for illustration
    var illustrations_params: IllustrationCreationParamsData[] =
        Object.keys(sentences_richness).flatMap((p_index) => {

            // 1 - sort sentences by richest 
            const paragraph_sentences = sentences_richness[p_index]
            var best_s_with_similarities = sortSimilarSentencesByRichest(paragraph_sentences)
            var best_s_without_similarities = sortUnsimilarSentencesByRichness(paragraph_sentences)
            const best_sentences = best_s_with_similarities.concat(best_s_without_similarities)


            // 2 - use the best sentence by avoiding an already used keyword
            const { sentence, sentence_index, paragraph_index } = best_sentences[0]
            // for now the description is written by hand client side
            // later it will be automated using ai
            const description = sentence.trim() // also removes "\n\n"
            const illustrationParams = IllustrationCreationParams.object(sentence, description, sentence_index, paragraph_index)

            // output 
            return illustrationParams
        })

    return {
        // return illustration params of each key passage
        key_passages: illustrations_params,
        paragraphs,
        sentences_richness,
    }

}

/** 
 * GET THEN SORTS THE RICH SENTENCES WITH SIMILARITIES TO KEYWORDS BY : 
 * - 1 - MOST SIMILAR TO KEYWORDS
 * - 2 - LONGEST SENTENCES
 */
export function sortSimilarSentencesByRichest(sentences_richness: SentenceRichnessData[]) {
    const sentences_with_similarities = sentences_richness.filter(el => { return el.similarities.length > 0 })
    var richest_sentencess = sentences_with_similarities
        .sort(function (a, b) { // - 2 - Sort by longest
            if (a.word_count > b.word_count) { return -1 }
            if (a.word_count < b.word_count) { return 1 }
            return 0
        })
        .sort(function (a, b) { // - 1 - Sort by most similar
            if (a.exact_match_count > b.exact_match_count) { return -1 }
            if (a.exact_match_count < b.exact_match_count) { return 1 }
            return 0
        })

    return richest_sentencess
},

export function sortUnsimilarSentencesByRichness(
    sentences_richness: SentenceRichnessData[]) {
    const sentences_without_similarities = sentences_richness.filter(
        el => { return el.similarities.length === 0 })
    var richest_sentencess = sentences_without_similarities
        .sort(function (a, b) { // Sort by most nouns count
            if (a.nouns_count > b.nouns_count) { return -1 }
            if (a.nouns_count < b.nouns_count) { return 1 }
            return 0
        })

    return richest_sentencess
}

export function trimUsedKeywords(
    similarities: SimilarityCheckData[], used_keywords: string[]) {
    return similarities.filter(el => { 
        return !used_keywords.includes(el.keyword) }) 
}

export function trimUsedKeywordsFromNouns(
    nouns: string[], used_keywords: string[]) {
    return nouns
        .filter(n => { return n.toLowerCase().replace("'s", "") }) 
        .filter(el => { return !used_keywords.includes(el) }) 
}

export function splitEquallyIntoParagraphs(
    text: string, desiredBatchCount: number) {
    var sentences = getSentences(text)
    function adjustBatchSizes<T>(inputArray: T[], desiredBatchCount: number): T[][] {
        const itemCount = inputArray.length;
        const batchSize = Math.floor(itemCount / desiredBatchCount);
        const remainingItems = itemCount % desiredBatchCount;

        const batches: T[][] = [];

        let startIndex = 0;
        let endIndex = 0;

        for (let i = 0; i < desiredBatchCount; i++) {
            startIndex = endIndex;
            endIndex = startIndex + batchSize;

            if (i < remainingItems) {
                endIndex++;
            }

            const currentBatch = inputArray.slice(startIndex, endIndex);

            batches.push(currentBatch);
        }

        return batches;
    }
    const bacthes = adjustBatchSizes(sentences, desiredBatchCount)
    // if there is less sentences than wanted this function will create 
    // empty batches so remove them. (in this case all other batches will
    // only have one item each)
    // and the batches count will be equal to the sentences count.
    const nonEmptyBatches = bacthes.filter(b => (b.length !== 0))
    return nonEmptyBatches
}

export function estimateMinReadingTime(text_characters: number) {
    const average_characters_per_second = 17.3,
        reading_time_estimation = (text_characters / average_characters_per_second)
    return reading_time_estimation * 0.6
}