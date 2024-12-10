/**
 * storyUtils.ts
 * version 1.0.0
 * 
 * Created on the 13/03/2023
 */

import ERRORS_MSGS from '../errors'
import CONSTANTS from '../constants'
import stringSimilarity from 'string-similarity'
import { CreateCompletionResponse } from 'openai'
import { aws, openAI } from '../backend'
import { IllustrationCreationParams, IllustrationCreationParamsData, StoryMediaCreationOutput, StoryMediaCreationOutputData, SentenceRichness, SentenceRichnessData, SimilarityCheck, SimilarityCheckData, StoryPromptData, InternalCompletionOutput, InternalCompletionOutputData, StoryTranslation, StoryTranslationData } from '../data'
import { generateID, isStringValid, trimWords, getWords, getSentences, getSourceParagraphIndex, trimLastSentenceIfIncomplete, mergeStrings } from '../utils'
import { OpenaiImageFormatType, OpenaiImageSizeType } from '../types'

/*
export async function createStoryIllustration(keyword: string, description: string, drawing_colors: string, sentence_index: number, paragraph_index: number, response_format: OpenaiImageFormatType = "url", size: OpenaiImageSizeType = "512x512", overridePrompt = "") {
    return new Promise<IllustrationCreationOutputData>(async (resolve, reject) => {
        const prompt = overridePrompt !== "" ? overridePrompt : openAI.promptHandler.getOneLineDrawingPrompt(description, drawing_colors)
        try {
            const image_data = await openAI.createImage(prompt, response_format, size)
            if (image_data) {
                const result = IllustrationCreationOutput.object(image_data, description, keyword, drawing_colors, prompt, size, sentence_index, paragraph_index)
                resolve(result)
            } else {
                reject(ERRORS_MSGS.OPENAI_RESPONSE_ERROR + " (one line drawing)")
            }
        } catch (error) {
            reject(error)
        }
    })
}
*/

/**
 * Splits the text into 3 paragraphs if possible.
 * 
 * CURRENT CODE LIMITATION: a url with a lot just few ".", disturbates the algorithm.
 * To prevent that we could say that a sentence is minimum x words (1 min word), if other sentences are not small as well.
 * Cut the text by it's character word count and cut at the nearest "."
 * 
 * EXEMPLE OF OUTPUT: 
 * const output = {
    "input": `"  I went on a Wikipedia trip and found this.. SENTENCE 2.\n\n    The following is a drop-in function that imp time of this answer.              SENTENCE 4.\n    If something doesn't fit your case, just remove it "`,
    "flattened_text": `"I went on a Wikipedia trip and found this.. SENTENCE 2.    The following is a drop-in function that imp time of this answer.              SENTENCE 4.    If something doesn't fit your case, just remove it. "`,
    "sentences": [
        `"I went on a Wikipedia trip and found this. "`,
        `"SENTENCE 2. "`,
        `"The following is a drop-in function that imp time of this answer. "`,
        `"SENTENCE 4. "`,
        `"If something doesn't fit your case, just remove it. "`
    ],
    "well_splited_paragraphs": [
        `"I went on a Wikipedia trip and found this. SENTENCE 2. "`,
        `"The following is a drop-in function that imp time of this answer. SENTENCE 4. "`,
        `"If something doesn't fit your case, just remove it. "`
    ]
}
 * 
export function splitTextInto3ParagraphsIfPossible(text_without_3_paragraphs: string) {


    // - 1 - COMPLETELY FLATTEN THE TEXT (WHETHER IT HAS LINE BREAKS, 2 PARAGRAPHS OR NONE)
    var flattened_text = flattenText(text_without_3_paragraphs)


    // 2 - GET SENTENCES
    // NOTE: this works by using ". " and not "\n"   (Sentence detection uses ". "  /  Paragraph detection uses "\n")
    var sentences = getSentences(text_without_3_paragraphs)
    // CONTAINS 3, 6, 9 ... sentences
    const isDividableBy3 = (sentences.length % 3 == 0)


    // 3 - SPLIT 
    // WORKS BY USING POINTS
    // SPLIT TEXT INTO 3 PARAGRAPHS IF POSSIBLE
    // Turns "S1. S2. S3." into ["S1", "S2", "S3"]
    var well_splited_paragraphs: string[] = []
    // 3.A - split into 3 paragraphs OF the EXACT SAME LENGHT
    if (isDividableBy3 && (sentences.length !== 0)) {
        well_splited_paragraphs = (splitIntoChunks(sentences, sentences.length / 3) as string[][]) // [["Sentence 1", "S2"], ["S3", "S4"], ["S5", "S6"]]
            .flatMap((chunkOfSentences) => {
                return mergeStrings(chunkOfSentences) ?? ""
            })
    }
    // 3.B - split into 3 paragraphs IF POSSIBLE and NOT EXACTLY the same LENGHT 
    else {
        // TRY SPLITING INTO 3 CHUNKS (THAT ARE ALMOST EQUAL IN LENGHT)
        switch (sentences.length) {
            case 0: break;
            case 1: well_splited_paragraphs = sentences; break
            case 2: well_splited_paragraphs = sentences; break
            default:
                // SPLIT (`p1s` means `paragraph 1 sentences`)
                var oneThird = Math.round(sentences.length / 3)
                var p1s = sentences.slice(0, oneThird); var p1 = mergeStrings(p1s) ?? ""
                // THEN SPLIT BY ABOUT HALF 
                var remaing_items = sentences.slice(oneThird)
                var aboutHalf = Math.round(remaing_items.length / 2)
                var p2s = remaing_items.slice(0, aboutHalf); var p2 = mergeStrings(p2s) ?? ""
                // LAST PART WHICH IS NOT EXACTLY OF THE SAME LENGHT
                var p3s = remaing_items.slice(aboutHalf); var p3 = mergeStrings(p3s) ?? ""
                // 
                well_splited_paragraphs = [p1, p2, p3]
        }
    }


    // 4 - SPLITTING OUTPUT DATA
    const output = SplittingOutput.object(text_without_3_paragraphs, flattened_text, sentences, well_splited_paragraphs)
    return output

}
*/

/**
 * - A - The generated story has 3 paragraphs: SPLIT INTO 3 paragraphs.
 * - B - The generated story has MORE / NONE / LESS than 3 paragraphs: ARTIFICIALLY OBTAIN 3 paragraphs by formatting text. (this could be improved)
export function handelSplittingInto3Paragraphs(text: string) {

    var paragraphs: string[] = []
    var input_paragraphs = getParagrahs(text)
    input_paragraphs = cleanSentences(paragraphs)

    // A
    if (input_paragraphs.length === 3) {
        paragraphs = input_paragraphs
    }
    // B 
    else {
        const spliting_output = splitTextInto3ParagraphsIfPossible(text)
        const well_splited_paragraphs = spliting_output.well_splited_paragraphs
        paragraphs = well_splited_paragraphs
    }

    return paragraphs

}
 */

/**  
 * Extracts the data of the BEST sentence to create a UNIQUE (≈ not always because the algorithm is quite simple) ILLUSTRATION of EACH paragraph in the text.
 * - LIMITATIONS: 
 * - the algorithm doesn't avoid redundancy very well. e.g.: if the text contains 2 sentences with the keyword "Yacht" it will create 2 illustrations of a "yacht".
 * - the algorithm doesn't really create precise prompts resulting in very general illustrations.
 * 
 * Was developped with @param generated_text = ` 

`"The party on the yacht was in full swing.
Everyone was dancing and having a great time."` 
 
`"The sun was setting and the colors in the sky were beautiful. 
It was a perfect day.\n\nThe yacht was anchored in Ibiza's harbor and the party continued until the early hours of the morning. "`
 
`"Everyone was exhausted but they all had a great time. 
They would all remember this incredible day for a long time."`
` 
- <---- THIS STORY IS GOOD BECAUSE IT SHOWS AN ISSUE : IT CAN OFTEN CREATE TWO PICTURES WITH THE KEYWORD "YACHT" --> the algorithm doesn't avoids redundancy very well.
*/
export function analyseAndExtractRichSentencesForIllustrations(generated_text: string, keywords: string[]) {


    // UTILS ---------------------------------------------------------------
    /** 
     * GET THEN SORTS THE RICH SENTENCES WITH SIMILARITIES TO KEYWORDS BY : 
     * - 1 - MOST SIMILAR TO KEYWORDS
     * - 2 - LONGEST SENTENCES
     */
    function sortSimilarSentencesByRichest(sentences_richness: SentenceRichnessData[]) {
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
    }

    /** 
     * GET THEN SORTS THE RICH SENTENCES WITHOUT SIMILARITIES TO KEYWORDS BY : 
     * - 1 - LONGEST (DEPRECATED)
     * - 2 - NOUNS COUNT
    */
    function sortUnsimilarSentencesByRichness(sentences_richness: SentenceRichnessData[]) {
        const sentences_without_similarities = sentences_richness.filter(el => { return el.similarities.length === 0 })
        var richest_sentencess = sentences_without_similarities
            .sort(function (a, b) { // Sort by most nouns count
                if (a.nouns_count > b.nouns_count) { return -1 }
                if (a.nouns_count < b.nouns_count) { return 1 }
                return 0
            })
        //.sort(function (a, b) { // Sort by longest
        // if (a.word_count > b.word_count) { return -1 }
        // if (a.word_count < b.word_count) { return 1 }
        // return 0
        // })

        return richest_sentencess
    }

    function trimUsedKeywords(similarities: SimilarityCheckData[], used_keywords: string[]) {
        return similarities.filter(el => { return !used_keywords.includes(el.keyword) }) // Removes "yacht" from ["yacht", "harbor", "morning"] if it is already used as a keyword.
    }

    function trimUsedKeywordsFromNouns(nouns: string[], used_keywords: string[]) {
        return nouns
            .filter(n => { return n.toLowerCase().replace("'s", "") }) // Transforms "Ibiza's" to "ibiza"
            .filter(el => { return !used_keywords.includes(el) }) // Removes "yacht" from ["yacht", "harbor", "morning"] if it is already used as a keyword.
    }
    // ---------------------------------------------------------------------


    // - 4.1 - ANALYSE each paragraph's sentences and there SIMILARIY with the KEYWORDS
    // N.B. : THIS PART COULD BE MORE DEVELOPPED / MORE THINGS CAN BE ANALYSED 
    // e.g. : LEXICAL FIELD, POSITIVITY ? , TYPE OF SENTENCE, DETECTING WORDS LINKED TO KEYWORDS, THEIR QUANTITY, ...
    /** 
     * An object like this, with `"0"` as the index of the paragraph : 
     * `{ 
     *   "0": [
     *     {
     *         "sentence": "The party on the yacht was in full swing. ",
     *          "word_count": 9,
     *           "similarities": [
     *              {
     *                  "keyword": "yatch",
     *                  "similar_word": "yacht",
     *                  "similarity": 0.5
     *              }
     *          ],
     *          "nouns_count": 3,
     *          "nouns": [
     *              "party",
     *              "yacht",
     *              "swing"
     *          ],
     *          "exact_match_count": 0,
     *          "source_paragraph_index": 0
     *      },
     *     }, 
     *     { ... }, 
     *     { ... }
     *   ], 
     *   "2": [ ... ], 
     *   "3": [ ... ]
     * }`
    */
    /*
     const paragraphs = handelSplittingInto3Paragraphs(generated_text)
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
 
 
     // EXTRACT RICHEST SENTENCES FOR ILLUSTRATIONS
     let illustrations_params: IllustrationCreationParamsData[] = []
     // for each PARAGRAPHS
     Object.keys(sentences_richness).forEach((p_index) => {
 
         // 1 - SORT THESE SENTENCES BY RICHEST 
         const paragraph_sentences = sentences_richness[p_index]
         var best_s_with_similarities = sortSimilarSentencesByRichest(paragraph_sentences)
         var best_s_without_similarities = sortUnsimilarSentencesByRichness(paragraph_sentences)
         const best_s = best_s_with_similarities.concat(best_s_without_similarities)
 
 
         // 2 - USE THE BEST SENTENCE FOR THIS PARAGRAPH WITH AN UNIQUE KEYWORD
         // (AVOIDS USING SAME KEYWORD HERE)
         const used_keywords = illustrations_params.flatMap(el => { return el.keyword })
         const paragraph_index = Number(p_index)
         // for each sentence of the PARAGRAPH
         best_s.forEach((sr, sr_index) => {
 
             // CHECK 
             // Is there already a sentence for this paragraph ?
             if (illustrations_params.filter(el => { return el.paragraph_index === paragraph_index }).length > 0) return
 
 
             // STATES
             const unique_nouns = trimUsedKeywordsFromNouns(sr.nouns, used_keywords)
             const unique_keywords = trimUsedKeywords(sr.similarities, used_keywords)
             // N.B.: The previous sentense from sentences sorted by richness not by order in the text. (and the list for this paragraph only)            const previous_sentence != best_s.find(sr2 => { return (sr2.paragraph_index === paragraph_index) && (sr2.sentence_index === (sr.sentence_index - 1)) })
             const previous_sr = best_s.find((sr2, sr2_index) => { return (sr2.paragraph_index === paragraph_index) && (sr2_index === (sr_index - 1)) })
 
 
 
 
             // LOGIC
 
             // ALGORITHM:
 
             // 1' - (for each sentence of the paragraph)
             // has unique keyword ?
             // yes: use unique keyword
             // no: don't use this sentence
 
             // 2' - (for each sentence of the paragraph)
             // prev sentence failed test OR no prev sentence and sentence has no UNIQUE keywords ? -> use 1st noun 
             // has unique noun ?
             // yes: use unique noun
             // no: don't use this sentence
 
             // 3' - EXTRACION FALLBACK - (one time for the entire paragraph)
             // no sentence could be used -> use the first one and use whatever can be
             // it's (unique noun OR unique keyword) if any 
 
             // LIMITATION OF CURRENT CODE: THE KEYWORD CAN BE USED BY A SENTENCE WHICH IS NOT THE BEST ONE THIS ILLUSTRATION. 
             // --> e.g.: THE KEYWORD IS ONLY ONCE IN THE SENTENCE AND ANOTHER SENTENCE MAY HAVE IT 4 TIMES AS WELL AS A LOT OF INFO ON THIS KEYWORD.
 
 
             var keyword = ""
             var sentence = sr.sentence
 
             // 1' - has unique keyword ?
             if (unique_keywords.length > 0) {
                 keyword = unique_keywords[0].keyword
                 // console.log(`\nCase 1 for paragraph-${paragraph_index} \n${sentence}`)
             } else {
 
                 // 2' - A: prev sentence failed test 1 OR B: no prev sentence and this sentence has no UNIQUE keywords ?
                 const no_prev_stce = (previous_sr === undefined)
                 const prev_stce_unique_keywords = trimUsedKeywords(previous_sr?.similarities ?? [], used_keywords)
                 var situation: "A" | "B" | null = null
                 if ((prev_stce_unique_keywords.length === 0) && (!no_prev_stce)) situation = "A";
                 else if (no_prev_stce && (unique_keywords.length === 0)) situation = "B";
                 switch (situation) {
                     case "A":
                     case "B":
                         if (unique_nouns.length > 0) {
                             keyword = unique_nouns[0]
                             // console.log(`\nCase 2-${situation} (success) for paragraph-${paragraph_index}  \n${sentence}`)
                         }
                     // else { console.log(`\nCase 2-${situation} (failed) for paragraph-${paragraph_index}  \n${sentence}`) }
                 }
 
             }
 
 
             // FINAL OUTPUT
             if (keyword !== "") {
                 var metadata = IllustrationCreationParams.object(keyword, sentence, sr.sentence_index, paragraph_index)
                 illustrations_params.push(metadata)
             } else console.log(`NO SENTENCE COULD BE USED FOR P: ${paragraph_index}`) // fallback will be used
 
         })
 
         // 3' - EXTRACION FALLBACK (N.B.: 3' ≠ step 3)
         if (illustrations_params.filter(el => { return el.paragraph_index === paragraph_index }).length === 0) {
             const first_s = best_s[0]
             const keyword = first_s.similarities[0]?.keyword ?? first_s.nouns[0]
             var metadata = IllustrationCreationParams.object(keyword, first_s.sentence, first_s.sentence_index, paragraph_index)
             illustrations_params.push(metadata)
             console.log(`\nFALLBACK: NO MATCH FOR paragraph ${p_index}`)
         }
 
     })
     */


    return {
        // illustrations_params: illustrations_params,
        // sentences_richness: sentences_richness
    }

}

/**
 * 
 * @param paragraphs_text : story's paragraphs flattened into a single string 
 * @param keywords : story's keywords
 * @param prompt : story's user propmt
 * @param story_hl : the human language the story is written into.
 * @param hl : the human language to translate the story into.
export async function createStoryTranslationDeprecated(paragraphs_text: string, keywords: string[], prompt: string, story_hl: string, hl: string, story_id: string, translateParagraphsFromInEnglish = false) {
    return new Promise<StoryTranslationData>(async (resolve, reject) => {

        var transation_queue: any[] = []
        transation_queue.push(paragraphs_text, keywords, prompt)
        var outputs = { paragraphs_text, keywords, prompt } // --> initialized to have fallbacks

        // LOGIC
        await Promise.all(transation_queue.map(async (el, index) => {
            try {
                switch (index) {
                    case 0:
                        if (translateParagraphsFromInEnglish) {
                            outputs.paragraphs_text = await aws.translateText(paragraphs_text, "en", hl)
                        } else {
                            outputs.paragraphs_text = await aws.translateText(paragraphs_text, story_hl, hl)
                        }
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
                        outputs.prompt = await aws.translateText(prompt, story_hl, hl)
                        break
                }
            } catch (error) {
                // handle translation error ...
            }
        }))

        // OUTPUT
        //const paragraphs = handelSplittingInto3Paragraphs(outputs.paragraphs_text)
        //const id = StoryTranslation.getId(story_id, hl)
       // const translation = StoryTranslation.object(id, hl, outputs.prompt, paragraphs, outputs.keywords)
       // resolve(translation)

    })
}
 */


// IMPROVING STORIES'S QUALITY: 
// - (OPTIONAL) CORRECT GRAMMAR (grammarbot)
// - CREATE A DATABASE OF 4 words per emoji (manual API calls)
// - HANDLING TOO SHORT STORY (javascript + openai)
// - AVOID PROMPT REPETITIONS or BUILD A AI THAT CONVERTS EXTRACTED 
//   PASSAGES INTO GREAT IMAGE PROMPTS (BY REFORMULATING THE PHRASE
//   AND ONLY KEEPING THE RICH INFO: KEYWORDS, NOUNS, ADJECTIVES, ETC.) 
//   e.g.: assign a keyword to a sentence that don't have any. If the 
//   sentence is about people and the keywords are ["People", "Yacht", 
//   "Party"] use "People". To make sure the illustration match with the
//   description. (FOR NOW THIS IS DONE BY DEDUCTING WHICH KEYWORD HAS 
//   ALREADY BEEN USED. WHICH SOMETIMES LEADS TO INCORRECT KEYWORD CHOICES
//   e.g.: "Yacht" but the sentence is about people.)
// - AVOID HAVING WORDS/TITLES IN THE ILLUSTRATION (-> unwanted "comic book"
//   like titles)

// FOR IMRPOVING SPEED: 
// STEP 4.2, STEP 5, STEP 6 could be done in parallel 
// (with something like : Promise.all(() => { doStep4_2(), doStep5(), doStep6() }))

// STORY CREATION SPEED: 
// STEP 1: 1.317s
// STEP 2: 2.197s
// STEP 3.1 (✅)
// STEP 3.2 (✅)
// STEP 4.1 (✅)
// STEP 4.2: 5.408s
// STEP 5: 1.128s
// STEP 6: 163.764ms
// STORY CREATED IN: 10.253s

/**
 * A story is 3 paragraphs and 2 photos.
 * Paragraphs: about 140/160 words, in user language, (about 0.8-1K tokens).
 * 
 * - 1 - FORMAT, CHECK and EXTRACT data from user PROMPT. e.g.: keywords, user language, emojis, nouns, ...
 * - 2 - GENERATE story from prompt using an AI MODEL (only in english for now).
 * - 3 - FORMAT the GENERATED STORY:
 *   - 3.1 - Remove UNWANTED WORDS if the generated story contains some.
 *   - 3.2 - Trim the last sentence if INCOMPLETE.
 *   - 3.3 - GCONTINUE COMPLETION if the story's text is too short.
 * - 4 - Generate the visuals 
 *   - 4.1 - Extract rich passages, that have good words (e.g.: ADJECTIVES, WORDS MATCHING KEYWORDS) and that describe an INTERESTING PART of the story.
 *   - 4.2 - Use KEYWORDS (Step 1) and the RICH PASSAGES (Step 4.1) to GENERATE 2 images with an AI MODEL (only in english for now).
 * - 5 - GET EMOJIS for the most PERTINENT KEYWORDS (deprecated)
 * - 6 - (OPTIONAL) TRANSLATE the text back to user language if it is not English.
 * 
 * LANGUAGE PART: CREATING A STORY IN AN "HL" OTHER THAN "en" (english) WILL RESULT IN CREATING A STORY IN THE GIVEN LANGUAGE AND ADDITIONNAL A TRANSLATION (in english) TO SAVE SEPERATLY.
*/
export function createStory(user_id: string, user_prompt: string, temperature: number, frequency_penalty: number, presence_penalty: number, drawing_colors: string, max_illustrations: number, max_emojis: number) {
    // WARNING : `completion` and `prompt` are sensitive information
    /** @ts-ignore */
    return new Promise<{ storyOutputData: StoryCreationOutputData, translation: StoryTranslationData | null, completionOutput: InternalCompletionOutputData }>(async (resolve, reject) => {


        // PARAMS
        console.log("\n\n\n------- CREATING STORY DATA & MEDIA -------")
        console.time("\n\nSTORY CREATED IN")
        if (!isStringValid(user_id) || !isStringValid(user_prompt)) return reject(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS) // or invalid params. e.g.: "uid" is a number instead of a string



        // 1 - GENERATE PROMPT
        console.time("STEP 1")
        const id = generateID(24) // story_id 
        var storyPrompt: StoryPromptData
        try {
            storyPrompt = await openAI.promptHandler.generateStoryPrompt(user_prompt)
        } catch (error) {
            console.timeEnd("STEP 1"); console.timeEnd("\n\nSTORY CREATED IN");
            return reject(`Error ${error}`)
        }
        console.timeEnd("STEP 1")



        // 2 - GENERATE STORY
        console.time("STEP 2")
        const { prompt, hl } = storyPrompt
        let textCompletionResponse: CreateCompletionResponse
        /** `generated_text` is in english */
        var generated_text: string; // var story_text: string;
        var internalCompletionOutput: InternalCompletionOutputData
        try {
            const max_tokens = 200
            textCompletionResponse = await openAI.createCompletion(prompt, temperature, frequency_penalty, presence_penalty, max_tokens)
            generated_text = textCompletionResponse.choices[0].text ?? ""

            // FOR DEVELOPMENT / LOCAL USAGE
            const completion = `${generated_text}` // shallow copy
            const model = CONSTANTS.MODELS.OPENAI.CURIE_1
            const created_at = new Date().toISOString()
            const usage = textCompletionResponse.usage
            internalCompletionOutput = InternalCompletionOutput.object(completion, prompt, model, max_tokens, temperature, frequency_penalty, presence_penalty, created_at, usage)

        } catch (error) { console.timeEnd("STEP 2"); console.timeEnd("\n\nSTORY CREATED IN"); return reject(error) } // error code: 500
        console.timeEnd("STEP 2")


        // 3 - FORMATTING
        // 3.1 - REMOVES UNWANTED ADDED WORDS IF THEY ARE IN THE TEXT
        generated_text = trimWords(generated_text, CONSTANTS.UNWANTED_WORDS_IN_GENERATED_STORY)
        console.log("STEP 3.1 (✅)")

        // 3.2 - TRIM LAST SENTENCE IF INCOMPLETE
        const trimmingResponse = trimLastSentenceIfIncomplete(generated_text)
        generated_text = trimmingResponse.formatted_text
        console.log("STEP 3.2 (✅)")

        // 3.3 - CONTINUE COMPLETION
        // TODO: CONTINUE IF TOO SHORT


        // 4.1 - EXTRACT RICH PASSAGES
        /** @ts-ignore */
        const { illustrations_params } = analyseAndExtractRichSentencesForIllustrations(generated_text, [])
        console.log("STEP 4.1 (✅)")

        // 4.2 - GENERATE ILLUSTRATIONS
        console.time("STEP 4.2")
        var media_output: StoryMediaCreationOutputData[] = []
        /** @ts-ignore */
        await Promise.all(illustrations_params.slice(0, max_illustrations).flatMap(async (el) => {
            try {
                // const imageData = await createStoryIllustration(el.keyword, el.sentence, drawing_colors, el.sentence_index, el.paragraph_index, "url", "512x512")
                // media_output.push(imageData)
            }
            catch (error) {
                console.timeEnd("STEP 4.2")
                //  console.log(`\nERROR WHILE CREATING IMAGE FOR KEYWORD/SENTENCE ("${el.keyword}"/"${el.sentence}"): ${error}`)
            }
        }))
        console.timeEnd("STEP 4.2")


        // 5 - EMOJIS
        // GET MOST PERTINENT KEYWORDS
        console.time("STEP 5")
        const generated_words = getWords(generated_text).flatMap(w => { return w.replace("'s", "") })
        const formatted_keywords = storyPrompt.keywords.flatMap(kwd => { return kwd.toLowerCase().replace("'s", "") })
        const most_pertinent_kds = formatted_keywords.flatMap(kw => {
            const similarities_count = generated_words.filter(w => { return w === kw }).length
            return { text: kw, count: similarities_count }
        }).sort(function (a, b) { // Sort by most recurrent
            if (a.count > b.count) { return -1 }
            if (a.count < b.count) { return 1 }
            return 0
        })
        const keywords = most_pertinent_kds.flatMap(el => { return el.text })
        /* (DEPRECATED) ---------------------------------
        

        // GET EMOJIS OF THE MOST PERTINENT KEYWORDS
        var keywords: KeywordData[] = []
        var emojiCompletionsUsageData: (number | string)[][] = []
        if (max_emojis > 0) {
            await Promise.all(most_pertinent_kds.slice(0, max_emojis).flatMap(async (kw) => {
                const keyword_text = kw.text
                await openAI.getEmoji(keyword_text)
                    .then(emojiData => {
                        const keywordData: KeywordData = Keyword.object(keyword_text, emojiData?.emoji ?? "")
                        keywords.push(keywordData)
                        const emojiUsage = emojiData?.usage
                        if (emojiUsage) emojiCompletionsUsageData.push(emojiUsage)
                    }).catch((error) => { console.timeEnd("STEP 5"); console.log(`ERROR while getting emoji - data ("${keyword_text}"): ${error}`) })
            }))
        }
        // ADD THE REST OF THE KEYWORDS (WITHOUT EMOJIS)
        var keywords_without_emojis = formatted_keywords.filter(kw => { return !keywords.map(k => k.text).includes(kw) })
        keywords = keywords.concat(keywords_without_emojis.flatMap(kw => { return Keyword.object(kw, null) }))
        ---------------------------------------------------
        */
        console.timeEnd("STEP 5")


        // 6 - TRANSLATE
        console.time("STEP 6")
        const translation_hl = "en"
        // var paragraphs = handelSplittingInto3Paragraphs(generated_text)  // --> fallback 
        var keywords_in_english: string[] = []
        var prompt_in_english = ""
        const translationNeeded = hl !== "en"
        if (translationNeeded) {
            //const { paragraphs: pgs, title: ppt, keywords: kws } = await createStoryTranslationDeprecated(generated_text, keywords, user_prompt, hl, translation_hl, id, true)
            // paragraphs = pgs
            //prompt_in_english = ppt
            //keywords_in_english = kws
        }
        console.timeEnd("STEP 6")



        // OUTPUT BACKEND DATA VALUES
        const date = new Date()
        const created_at = date.toISOString()
        const year = date.getUTCFullYear()
        const month = date.getUTCMonth()
        const media = media_output.sort(function (a, b) { // sort by ascending
            if (a.paragraph_index < b.paragraph_index) { return -1 }
            if (a.paragraph_index > b.paragraph_index) { return 1 }
            return 0
        })
        // const paragraphs_text = mergeStrings(paragraphs) ?? ""
        //  const words = getWords(paragraphs_text, true)
        // const words_count = words.length
        const { completion_tokens, prompt_tokens, total_tokens } = textCompletionResponse.usage ?? {}
        // USAGE CALCULATION
        const textCompletionUsage = (completion_tokens && prompt_tokens && total_tokens) ? [total_tokens, completion_tokens, prompt_tokens, "text"] : null
        //     const emojiCompletionsUsage = sumUpAllFormattedUsageData(emojiCompletionsUsageData)
        var usage: (string | number)[][] = []
        if (textCompletionUsage) usage.push(textCompletionUsage)
        //     if (emojiCompletionsUsageData.length > 0) usage.push(emojiCompletionsUsage)
        // TRANSLATION (always in english)
        var translation: StoryTranslationData | null = null
        // if (translationNeeded) {
        //    const translation_id = `${id}-${translation_hl}`
        //    const paragraphs_in_english = handelSplittingInto3Paragraphs(generated_text)
        //    translation = StoryTranslation.object(translation_id, translation_hl, prompt_in_english, paragraphs_in_english, keywords_in_english)
        // }


        // OUTPUT BACKEND DATA
        // const storyOutputData = StoryCreationOutput.object(id, user_id, created_at, year, month, paragraphs, user_prompt, hl, keywords, usage, media, { generated_text: generated_text, trimmed: trimmingResponse.trimmed }, words_count)
        // console.timeEnd("\n\nSTORY CREATED IN")
        // resolve({ storyOutputData: storyOutputData, translation: translation, completionOutput: internalCompletionOutput })


    })
}




/** CREATES, SAVES and RETURNS a StoryData in the specified format ("encrypted" by default).
   * 
   * - 1 - EXTRACT and CHECK PARAMS 
   * - 2 - CREATE THE STORY 
   * - 3 - FORMAT DATA FOR CLIENT (3.A and optionnaly one of the other options): 
   *     - 3.A - Removes sensitive information (simplify data)
   *     - 3.B - Flatten data (removes the keys)
   *     - 3.C - Encrypt data so it can't be understood from a Browser console. e.g.: Chrome DevTools.
   * - 4 - 
   * - 5 - SAVES STORYs' DATA & DRAWINGS ON THE DATABASE
   * - 6 - SEND OUTPUT DATA
   * - 7 - COMPRESS SAVED IMAGES 
   * 
   * - STEP ... - (just an idea : SAVE LOGS ON THE DATABASE (tokens used, translated characters count))
   * 
   * (STEP 4 takes about: 200ms)
   */
/*
async handleCreateStory(req: Request, res: Response) {

    console.log("\n\n\n------- CREATING and SAVING STORY -------")
    console.time("DONE IN")


    // 1 - PARAMS
    console.time("STEP 1´")
    const bot = await checkBotAccess(req).catch(err => { return undefined })
    const user_id = bot ? bot.bot_name : req.body.uid as string
    const isCustomStory = bot?.bot_name === user_id
    const user_prompt = req.body.p as string
    // AI MODEL PARAMS
    const temperature = Number(req.body.t ?? 0.7)
    const frequency_penalty = Number(req.body.fp ?? 0.4) // was 0 then 0.5
    const presence_penalty = Number(req.body.pp ?? 0)
    const drawing_colors = (req.body.dc as string | undefined) ?? "multicolor"
    const noIllustrations = req.body.ni == true
    // FORMAT 
    const format = getDataFormatParam(req, 'e')
    // COST LIMITATION
    const MAX_ILLUSTRATIONS = noIllustrations ? 0 : 3 // Limits costs 
    const MAX_EMOJIS = 0 // -> limits costs (DEPRECATED) reason: can cost a lot ($0.20 cent / story) but does not really improves the experience a lot.
    console.timeEnd("STEP 1´")
    if (!isStringValid(user_id) || !isStringValid(user_prompt)) {
        console.timeEnd("DONE IN")
        res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS) // or invalid params. e.g.: "uid" is a number instead of a string
        return
    }


    // 2 
    console.time("STEP 2´")
    var storyOutputData: StoryCreationOutputData
    var translation: StoryTranslationData | null
    var completionOutput: InternalCompletionOutputData | null = null
    try {
        const output = await createStory(user_id, user_prompt, temperature, frequency_penalty, presence_penalty, drawing_colors, MAX_ILLUSTRATIONS, MAX_EMOJIS)
        storyOutputData = output.storyOutputData
        translation = output.translation
        completionOutput = output.completionOutput
    } catch (error) {
        console.timeEnd("DONE IN")
        console.timeEnd("STEP 2´")
        return res.status(400).send(error)
    }
    console.timeEnd("STEP 2´")


    // 3 - FORMAT DATA FOR CLIENT 
    console.time("STEP 3´")
    const story = Story.objectFrom(storyOutputData)
    var apiResp = await ApiResponse.objectFrom(story, format, "story")
    console.timeEnd("STEP 3´")


    // 4 - FORMAT and SAVE THE OUTPUT (LOCALLY)
    if (bot && !production) {
        try {
            // PARAMS
            console.time("STEP 4´")
            const fileNames = ["stories-completions.json", "story-fine-tuning.json"]

            // COMPLETION DATA
            const completionFilePath = saveOnLocalFile({ story: story, completionOutput: completionOutput, translation: translation }, fileNames[0])

            // FINE TUNING DATA
            const prompt = storyOutputData.user_prompt
            const completion = mergeStrings(storyOutputData.paragraphs) ?? ""
            const fineTuning = FineTuning.object(prompt, completion)
            const fineTuningFilePath = saveOnLocalFile(fineTuning, fileNames[1])

            // UPDATE RESPONSE
            const message = `✅ completion saved at ${completionFilePath} Fine tuning data saved at ${fineTuningFilePath}`
            const output = { story: story, completionOutput: completionOutput, translation: translation, message: message }
            console.log(`\n ${message}`)
            apiResp = ApiResponse.object(output, "bot-local")
            console.timeEnd("STEP 4´")
        } catch (error) {
            // ...
            console.log(error)
        }
    } else console.log("STEP 4 NOT NEEDED")


    // 5 - SAVE THE STORY, TRANSLATION and UPDATE the global metric story_count (database)
    console.time("STEP 5´")
    const databaseFormatStory = Story.databaseFormat(story)
    const queue = [
        () => setItem(databaseFormatStory, "story"),
        () => setItem(translation, "translation"),
        () => updateGlobalMetricCount(isCustomStory ? "custom-story" : "story", "incr")
    ]
    await Promise.all(queue.map(async doAction => {
        try {
            await doAction()
        } catch (error) {
            // ...
        }
    }))
    console.timeEnd("STEP 5´")


    // 6 - SEND OUTPUT TO CLIENT / POSTMAN
    console.timeEnd("DONE IN")
    res.send(apiResp)


    // 7 - COMPRESS AND SAVE IMAGES + update images urls (avoids making the client wait)
    console.time("STEP 7´")
    const { media, id: story_id } = story
    var savedImges: { index: number, fileName: string }[] = []
    await Promise.all(media.map(async (el, index) => {
        // PARAMS
        const url = el.image_data
        const fileName1 = Illustration.getFileName(story_id, el.paragraph_index)
        const fileName2 = Illustration.getFileName(story_id, el.paragraph_index, "i-uncompressed")
        try {
            // 7.1 - COMPRESS + UPLOAD
            await aws.S3.uploadImage (url, fileName1)
            // saves a copy with the image in original quality / size . N.B. there isn't await so we don't wait for this
            aws.S3.uploadImage (url, fileName2, false)
            savedImges.push({ index: index, fileName: fileName1 })
        } catch (error) {
            // CAUSE : GENERAL APP PROBLEM
            // WARNING: QUITE BAD AS IMAGES WILL BE LOST.
            // CONSEQUENCE: NEW STORIEW WILL WON'T HAVE IMAGES BEEN DISPLAYED AFTER x TIME ONCE CREATED.
            // EXPLANATION: the urls to access OPENAI's images will have expired.
        }
    }))
    // 7.2 
    var updatedMedia: IllustrationData[] = []
    savedImges.forEach(el => {
        // NEW IMAGE URL DATA
        const CDN_URL = CONSTANTS.URLS.CDN_URL
        const imgUrl = `${CDN_URL}/${el.fileName}`
        // MEDIA WITH IMG URL
        var newMedia = Object.assign({}, media[el.index])
        newMedia.image_data = imgUrl
        updatedMedia.push(newMedia)
    })
    try {
        // UPDATE
        const sortedMedia = updatedMedia
            // SORTED BY ASCENDING ORDER
            .sort(function (a, b) {
                if (a.paragraph_index < b.paragraph_index) { return -1; }
                if (a.paragraph_index > b.paragraph_index) { return 1; }
                return 0;
            })
        const formattedMedia = dataFormatter.formatArray(sortedMedia)
        const firebaseFormatMedia = firebaseDataFormatter.formatNestedArray(formattedMedia)
        const keyValues = { "media": firebaseFormatMedia }
        const output = await updateItem(story_id, keyValues, "story")
    } catch (error) {
        // ...
    }
    console.timeEnd("STEP 7´")


},
*/