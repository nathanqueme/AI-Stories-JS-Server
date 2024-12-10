/**
 * main.ts
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

import { Request } from "express"
import { MatchingEmojiData } from "../../data"
import { DataFormatType, ResourceType } from "../../types"
import { mainConfig } from "../../backend/configs"
import CONSTANTS from "../../constants"
import path from 'path'
import fs from 'fs'
import axios from "axios"


const emojisObject: object = require("../../utils/assets/emojis_en.json")
const { production } = mainConfig


export function generateID(length = 4, onlyNumbers = false, charactersToUse = "") {
    var result = ''
    var characters = charactersToUse !== "" ? charactersToUse : onlyNumbers ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length

    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength))
    }

    return result
}

// UNUSED
export function getUTCYearMonth(date = new Date()) {
    const year = date.getUTCFullYear()
    var month = date.getUTCMonth()
    return formatYearMonth(year, month)
}

// UNUSED
/** "2023-01" / "2023-12" */
export function formatYearMonth(year: number, month: number) {
    const month_string = `${month}`.length === 1 ? `0${month}` : `${month}`
    return `${year}-${month_string}`
}

/** USED FOR FIRESTORE: ENABLES SAVING MORE THAN 500 ITEMS IN A BATCH OPERATION BY SPLITING ITEMS INTO MANY CHUNKS AND SAVING THEM ALL AT ONCE. */
export function splitIntoChunks(items: any[], chunkSize = 500): any[][] | any[] {
    var chunks = []
    if (chunkSize <= 0) {
        return items
    } else {
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            chunks.push(chunk)
        }
        return chunks
    }
}

/** USED TO CHECK THE VALIDITY OF A STRING : 
 * - 1 - IF IT IS A STRING 
 * - 2 - IF IT HAS A NON EMPTY VALUE 
 */
export function isStringValid(value: any) {
    return ((value !== undefined) && (value !== null) && (typeof (value) === "string") && (value !== ""))
}

/** USED TO CHECK THE VALIDITY OF A NUMBER : 
 * - 1 - IF IT IS A NUMBER 
 * - 2 - IF IT HAS A NON EMPTY VALUE 
 */
export function isNumberValid(value: any) {
    if (typeof value != "number") return false
    return ((value !== undefined) && (value !== null) && (!isNaN(value)))
}

/** Will use the value if not empty (not Null, not) */
export function useOptionalNumber(value: number | null | undefined, fallback: number) {
    return isNumberValid(value) ? 
    value as number
    : fallback
}


/** USED TO CHECK THE VALIDITY OF AN ARRAY : 
 * - 1 - IF IT IS AN ARRAY 
 * - 2 - IF IT HAS AT LEAST ONE VALUE 
 */
export function isArrayValid(value: any) {
    return ((value !== undefined) && (value !== null) && (typeof (value) === "object") && ((value as any[])?.length > 0))
}

/** USED TO CHECK THE VALIDITY OF A DATES' STRING (new Date().toISOString()) : 
 * - 1 - IF IT IS A STRING AND A NON EMPTY VALUE 
 * - 2 - IF IT IS A VALID DATE
 */
export function isDateStringValid(value: any) {
    const isAString = isStringValid(value)
    if (!isAString) return false
    try {
        new Date(value)
        return true
    } catch (error) {
        return false
    }
}

// Does not supports plural yet : "glove" doesn't returns the emoji for "gloves". So to get the emoji of a plural word, first convert it to the singular.
export function getMatchingEmojis(word: string) {

    // CHECK 
    if (!isStringValid(word)) return []

    var mathching_emojis: MatchingEmojiData[] = []
    Object.keys(emojisObject).forEach(emoji => {

        // DATA
        const formatted_word = word.toLowerCase()
        const emoji_tags: string[] = (emojisObject as any)[emoji]
        const exact_m_t_index = emoji_tags.flatMap(tag => { return tag === formatted_word }).findIndex(el => { return el === true })
        const match_exactly = exact_m_t_index !== -1

        // A - Exact match ("glove" === "glove")
        if (match_exactly) {
            mathching_emojis.push({ "emoji": emoji, "best_matching_tag_index": exact_m_t_index, "tags": emoji_tags, "exact_match": true })
        }
        // B - Is included into a tag made of two words (is "glove" is in "boxing_glove")
        else {
            emoji_tags.forEach((m_tag, tag_index) => {
                // Converts "boxing_glove" to ["boxing", "glove"]
                var deformatted_m_tag = m_tag.split("_")
                var matches_one_word = deformatted_m_tag.includes(formatted_word) // "glove" === "love" ?
                if (matches_one_word)
                    mathching_emojis.push({ "emoji": emoji, "best_matching_tag_index": tag_index, tags: emoji_tags, "exact_match": false })
            })
        }

    })

    return mathching_emojis
}
/** 
 * - Returns the emojis that are match with the given word. The results are sorted by most relevant. 
 * - If no emoji match, returns null. 
 * - PLURAL WORDS LIMITATION : this function only works with singular words. So to get the emoji of a plural word, convert it to the singular.
*/
export function getBestMatchingEmojis(word: string, max: number | undefined = undefined) {
    const matchingEmojis = getMatchingEmojis(word)
    matchingEmojis // Sort by most pertinent match 
        .sort(function (a, b) { // Use the results where the "matching_tag_index" is the lowest, so where it was one of the first tags from the tagslist to match.
            if (a.best_matching_tag_index < b.best_matching_tag_index) { return -1 }
            if (a.best_matching_tag_index > b.best_matching_tag_index) { return 1 }
            return 0
        })
        .sort(function (a, b) { // Get the results with an exact match first if any.
            if (a.exact_match > b.exact_match) { return -1 }
            if (a.exact_match < b.exact_match) { return 1 }
            return 0
        })
    const bestMatchingEmojis = matchingEmojis.length > 0 ? matchingEmojis.slice(0, max) : null
    return bestMatchingEmojis
}

/** 
 * - Returns each paragraph of the given text. 
 * - The functions WORKS BY USING LINE BREAKS. It knows how to differienciate a line skip (only 1 line break) from a paragraph (+1 line break).
 * - It can recognizes paragraphs with more than one line break.
 * - Returns phrases 
 */
export function getParagrahs(text: string) {
    var paragraphs: string[] = []
    var text_blocks =
        text.split(/\r?\n|\r/g) // Line break REGEX: https://stackoverflow.com/a/10805292  // ["B1 text", "", "   ", "", "B2 text", "      ", "", "B3 text", "", "B4 text"]
            // In this exemple B4 is not a paragraph because B4 touches B3 so B3 & B4 form the Paragraph 3
            // so paragraph = ["B1 text", "B2 text", "B3 text & B4 text"]
            .flatMap((text, index) => {
                const element = { text: text, index: index }; return element
            })
    text_blocks = text_blocks.filter(el => { return el.text.trim() !== "" }) // [{ text: "B1 text", index: 0 }, ..., { text: "B4 text", index: 7 }]
    // 
    text_blocks.forEach(((block, i) => {
        if (i === 0) return paragraphs.push(block.text)
        const last_block = (text_blocks as any)[i - 1]
        // Offset with last block 
        const offset = block.index - last_block.index
        // Where the 2 blocks 2 SEPERATED PARAGRAPHS
        // Or just 1 PARAGRAPH made of 1 block and another one at the new line.
        if (offset > 1) { // was another paragraph
            paragraphs.push(block.text)
        } else { // was part of the previous paragraph
            const last_paragraph_index = paragraphs.length - 1
            paragraphs[last_paragraph_index] = `${paragraphs[last_paragraph_index]}\n${block.text}`
        }
    }))
    return paragraphs
}

/** 
 * - Fixes sentences punctuation. (IF NEEDED)
 * - Does sort of that there is always at the end:  `". "`
 * - Converts `".."` into `". "`
 */
export function correctPunctuation(sentence: string) {
    if ((sentence.length === 0) || (sentence.length <= 2)) return sentence

    var beforeLastOne = sentence.charAt(sentence.length - 2)
    var lastOne = sentence.charAt(sentence.length - 1)
    if ((beforeLastOne === ".") && (lastOne === " ")) {
        return sentence
    }
    else if ((lastOne === ".") && (beforeLastOne === ".")) {
        return `${sentence.slice(0, sentence.length - 1)} `
    }
    else if (lastOne.includes(".")) {
        return `${sentence} `
    }
    else return `${sentence}. `
}

/**
 * Merges the strings by respecting the whitespace included into the strings.
 * 
 * @param {string[]} strings: [`"Hello, this is Haylee"`, `"   __   I'm near the coffee shop"`, `"To buy a smoothie"`] 
 * @returns {string} sentence : `"Hello, this is Haylee.   __   I'm near the coffe shop. To buy a smoothie."` 
 */
export function mergeStrings(strings: string[]) {
    switch (strings.length) {
        case 0: return null
        case 1: return strings[0]
        default:
            const sentence = strings.reduce((accumulator, currentValue) => {
                return accumulator + currentValue
            }, "")
            return sentence
    }
}

/** 
 * Removes the given words from the text. 
 * NOTE: This will cause the sentence to be trimmed 
 */
export function trimWords(text: string, unwanted_words: string[]) {
    if (unwanted_words.length === 0) return text
    var trimmed_text = text
    unwanted_words.forEach((word) => {
        trimmed_text = trimmed_text.split(word).join("").trim()
    })
    return trimmed_text
}

/** 
 * Cleans the given paragraphs/sentences.
 * 
 * For each paragraph/sentence : 
 * - 1 - TRIM any extra WHITESPACE.
 * - 2 - FIX the PUNCTUATION.
 */
export function cleanSentences(strings: string[]) {
    const cleaned_strings = strings.flatMap(el => {
        const trimmed_text = el.trim()
        const cleaned_text = correctPunctuation(trimmed_text)
        return cleaned_text
    })
    return cleaned_strings
}

/**  Returns a flattened version of the text without line breaks and paragraphs anymore. */
export function flattenText(text: string, correct_punctuation = true) {
    var flattened_text = text.trim()
    if (correct_punctuation) flattened_text = correctPunctuation(flattened_text)
    flattened_text = flattened_text.replaceAll("\n", " ")
    var paragraphs = getParagrahs(flattened_text); paragraphs = cleanSentences(paragraphs)
    flattened_text = mergeStrings(paragraphs) ?? ""

    return flattened_text
}

/**
 * Removes all non alphabetic and non numeric character from the word.
 * e.g.: `"\nHell🅾️o👋!""` returns `"Hello"`
 * LIMITATION: Sometimes openai adds "\\n" instead of "\n" and this function does not cleans it up properly. `"Hello\\n"` returns `"Hellon"`
 */
export function trimAllNonAlphabeticAndNumericChar(word: string) {
    const lettersAndNumbers = Array.from(word).filter((char) => {
        return (char.match(CONSTANTS.REGEX.LETTERS_AND_NUMBERS) !== null) || (char === "'") || (char === "`") || (char === "´") || (char === "-")
    })
    const cleared_word = mergeStrings(lettersAndNumbers)
    return cleared_word
}

/** 
 * Return all words from the given text.
 * `!Hello\\n👋! my name is  Jo👶nhy \n\nBye."`
 * Returns [`"Hello"`, `"my"`, `"name"`, `"is"`, `"Jonhy"`, `"Bye"`]
 */
export function getWords(text: string, toLowerCase = true) {
    var words = text
        .split(" ")  // ["!Hello\\n👋!",  "", "my", "", "name", "", "is", "", "" , "Jo👶nhy's", "\n", "","\n\nBye."]
        .flatMap((unformatted_word) => {
            // REMOVES ANY PUNCTUATION OR EMOJI STICKED TO THE WORD
            var word = unformatted_word.replace("\\n", "")
            word = trimAllNonAlphabeticAndNumericChar(word) ?? word
            if (toLowerCase) word = word.toLowerCase()
            return word
        }) // ["Hello", "", "my", "", "name", "", "is", "Jonhy's", "\n", "", "Bye"]
        .filter((word) => { return (word !== "") && (word !== "\n") }) // [ "Hello", "my", "name", "is", "Jonhy's", "Bye" ]
    return words
}

// FIXME (issue) for now the "\n\n" between non quotes text are not conserved. 
// FIXME (exemple) "Sentence.\n\nOther Sentence.\n\nFirst quote: \"Hey!\"" get transformed
// into : "Sentence. Other sentence. \n\nFirst quote: \"\Hey!""
export function getSentences(text: string) {

    // NOTE: to work well, you must writte each person's comment with at it's begining "\n\n"
    // e.g. "Sentence 1. Sentence2. \n\n"
    // if you don't: sentences won't be effectively splitted and will end up be VERY long

    function isCommentSentence(s: string) {
        const containsEnglishQuotes = ((s.match(/\"/g)?.length ?? 0) > 1)
        // for "french", "spanish", "arab", "russian"
        const containsFrenchQuotes = (s.includes("«") || s.includes("»"))
        // "korean", "Deutsch", "Portugese"
        const containsDeutschQuotes = (s.includes("„") || s.includes("“"))
        const containsQuotes = containsEnglishQuotes || containsFrenchQuotes || containsDeutschQuotes
        const isComment = s.includes(":") && containsQuotes
        return isComment
    }

    var sentences = `${text}`.split("\n\n")
    sentences = sentences.filter(el => { return el.trim() !== "" }); // Removes sentences that are equal to ""

    // QUOTES
    sentences = sentences.flatMap(s => {
        // isolate comment sentences 
        // NOTE it is wanted to ignore spliting sentences inside comments 
        if (isCommentSentence(s)) return s
        // split by any sub sentences in that string ending by ". ", "! ", "? "
        var sts = s.split(/([A-Z][^.!?]*(?:[.!?]|$))/g)
        // TODO support russian
        return sts
    })
    sentences = sentences.filter(el => { return el.trim() !== "" }); // Removes sentences that are equal to ""

    // NON QUOTES
    sentences = sentences.flatMap((s, index) => {
        const prevSentenceWasComment = ((index - 1) > 0) && (isCommentSentence(sentences[index - 1]))
        const isComment = isCommentSentence(s)
        // format strings to add \n\n at begining when needed and remove unneeded " " whitespace
        // warning, may remove \n too
        if (prevSentenceWasComment || isComment) return `\n\n${s.trim()}`
        return s.trim()
    })

    // CORRECT PUNCTUATION
    sentences = sentences.flatMap(s => {
        var lastChar = s.charAt(s.length - 1)
        const lacksSpace = (lastChar === ".") || (lastChar === "!") || (lastChar === "?")
        if (lacksSpace) return `${s} `
        return s
    })

    return sentences

    // messy other version :
    /*
    // 1 - SPLIT 
    const sentence_while_preserving_comments_regex = /(?:(?<=^)|(?<=\n\n))(.*?(?:(?<!\\)"[^"]*(?<!\\)"[^.]*)*(?:[.!?])(?=\s|$))/g;
    // does not cut the sentences inside people's comments. 
    // e.g.: "Sammy (talking to Bob): \"Hey there! Have you seen this view ?\""
    // will stay intact even if there is in reality 2 sentences.
    // NOTE sometimes sentences ending with "Hello world. " can not end up being slited
    var sentences = text.split(sentence_while_preserving_comments_regex)
    sentences = sentences.flatMap(s => s.split("\n"))
    sentences = sentences.flatMap(s => s.split("\n\n"))

    // correct unsplitted ". " sentences
    // e.g. "Once upon a time, in the heart of the bustling city, Sammy the squirrel and his friend Bella found themselves in Central Park. They hopped and skipped through the vibrant greenery, their little voices filled with excitement. Sammy: \"Bella, look. All the trees! Central Park is amazing!\" Other sentence."
    // TODO: 

    // 2 - CLEAN
    sentences = sentences.filter(el => { return el.trim() !== "" }); // Removes sentences that are equal to ""
    if (clean_sentences) sentences = cleanSentences(sentences);      // Adds the ". " back and trim extra whitespaces


    // 3 - FORMAT 
    // will add "\n\n" to the begining of the sentence if it is 
    // a person's comment 
    sentences = sentences.flatMap(s => {
        const isComment = s.includes(":") && ((s.match(/\"/g)?.length ?? 0) > 1)
        if (isComment) return `\n\n${s}` // e.g. "Sammy: "\Hey!\"" or "Daniel (looking at him): "\Hoho!\""
        return s
    })

    return sentences
    */
}

/** */
export function getSourceParagraphIndex(text: string, paragraphs: string[]) {
    var paragraphs_index =
        paragraphs
            .flatMap((p, index) => { if (p.includes(text)) { return index } })
            .filter((el) => el !== undefined) as number[]

    var paragraph_index = paragraphs_index.length > 0 ? paragraphs_index[0] : -1

    return paragraph_index
}


/** Removes the last sentence if it is incomplete.
  * e.g.: `"Hello, I'm James! And I am a"` -> `"Hello, I'm James!"`
  * @param {string} text: the text with the sentences and the potential uncomplete sentence at the end.
 */
export function trimLastSentenceIfIncomplete(text: string) {

    var trimmed = false
    var remaining_text = ""
    var formatted_text = text

    var has_at_least_one_dot = text.includes(".")
    var last_dot_index = text.lastIndexOf(".")

    if (has_at_least_one_dot && (text.length) > last_dot_index) {
        remaining_text = text.substring(last_dot_index + 1, text.length).trim()
        if (remaining_text.length > 0) {
            trimmed = true
            formatted_text = formatted_text.slice(0, last_dot_index + 1)
        }
    }
    return { formatted_text: formatted_text, original_text: text, incomplete_sentence: remaining_text, trimmed: trimmed }
}

/**
 * e.g.: [[10, 6, 4, "emoji"], [10, 8, 2, "emoji"]] returns => [20, 14, 6, "emoji"]
 */
export function sumUpAllFormattedUsageData(formatted_usage_data: (string | number)[][]) {
    return formatted_usage_data.reduce((accumulatedValue, valueItem) => {

        const c_total_tokens = (accumulatedValue[0] as number | null) ?? 0
        const c_completion_tokens = (accumulatedValue[1] as number | null) ?? 0
        const c_prompt_tokens = (accumulatedValue[2] as number | null) ?? 0

        const total_tokens = valueItem[0];
        const completion_tokens = valueItem[1];
        const prompt_tokens = valueItem[2];
        const ressource = valueItem[3] as string;

        const a = total_tokens as number + c_total_tokens
        const b = completion_tokens as number + c_completion_tokens
        const c = prompt_tokens as number + c_prompt_tokens

        return [a, b, c, ressource]
    }, [0, 0, 0, ""])
}

/** 
 * - Extracts `req.body.dtfmt` and ensures its' valid otherwise uses a fallback. 
 * - USES THE FALLBACK WHEN IN PRODUCTION MODE TO DISABLE OVERWRITTING THE `req.body.dtfmt`
 */
export function getDataFormatParam(req: Request, format_fallback: DataFormatType = "f"): DataFormatType {

    if (production) return format_fallback

    // "dtfmt" stands for "data format"
    // the name "dtfmt" is complicated enought so that strangers can hardly find it.
    const format = (req.body.dtfmt as DataFormatType | undefined) ?? req.query.dtfmt ?? format_fallback
    // CHECKS THAT THE FORMAT IS VALID
    switch (format) {
        case 'e':
        case 'f':
        case 'n-f': return format;
        // use the fallback if the format is invalid. By default the fallback is "formatted".
        default: return format_fallback;
    }
}

/** 
* - HANDLES EXTRACTING THE `"MAX"` PARAM FROM `"GET"` QUERIES 
* - HANDLES ERRORS (INVALID VALUE) BY USING THE DEFAULT FALLBACK VALUE. e.g.: 20 max for stories
*/
export function getMaxParam(req: Request, resource: ResourceType) {
    function useFallback() {
        // DEFAULT FALLBACK
        switch (resource) {
            case "story": return CONSTANTS.MODERATION.GET_QUERIES.MAX_STORIES
            default: return 20
        }
    }
    try {
        const max = req.query.max
        const numberIsValid = (typeof max === "number") && (max > 0)
        const stringIsValid = isStringValid(max)
        const number = Number(max)
        if ((numberIsValid) || (stringIsValid && (typeof number === "number") && (number > 0))) {
            return number
        } else return useFallback()
    } catch (error) {
        return useFallback()
    }
}

/** 
 * @param path e.g. "images/9nf5o2sxIqBVrmY8mbE0HJFU/0.jpg 
 * @returns e.g. { fileName: "0.jpg", folders: ["images", "9nf5o2sxIqBVrmY8mbE0HJFU"]  }
 */
export function extractImgFileNameAndFolders(filePath: string) {
    const segments = filePath.split("/");
    const fileName = segments.pop() ?? null;
    const folders = segments.filter((segment) => segment.length > 0);
    return { fileName, folders };
}

/** 
 * - THIS FUNCTION IS INTENDED TO BE USED LOCALLY. / ONLY DURING DEVELOPMENT.
 */
export function saveOnLocalFile(data: { [key: string]: any }, fileName: string, folder = "ait-json") {

    const folderPath = path.join(process.env.HOME ?? "", 'Desktop', folder);
    const filePath = path.join(folderPath, fileName);

    // 1 - Create the "json" folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    // 2 - CREATE FILE IF IT DOESN'T EXIST
    if (!fs.existsSync(filePath)) {
        const data: any[] = []
        fs.writeFileSync(filePath, JSON.stringify(data));
    }
    // 3 - GET PREVIOUS DATA
    const fileContent = fs.readFileSync(filePath).toString();
    var localData: any[] = []
    try {
        localData = JSON.parse(fileContent);
    } catch (error) {
    }

    // 3 - SAVE DATA (locally)
    const dataIsArray = isArrayValid(data)
    // add the data to the top so it's easy to see it.
    var allData = dataIsArray ? data : [data]
    if (isArrayValid(localData)) allData = allData.concat(localData)
    const jsonIndentation = 2
    fs.writeFileSync(filePath, JSON.stringify(allData, null, jsonIndentation))

    return filePath
}

/** 
 * - THIS FUNCTION IS INTENDED TO BE USED LOCALLY. / ONLY DURING DEVELOPMENT.
 */
export function readLocalFile(fileName: string, folder = "ait-json", format: "buffer" | "json"): any | null {

    const folderPath = path.join(process.env.HOME ?? "", 'Desktop', folder);
    const filePath = path.join(folderPath, fileName);

    // 1 - Create the "json" folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        return null
    }

    // 2 - CREATE FILE IF IT DOESN'T EXIST
    if (!fs.existsSync(filePath)) {
        return null
    }

    // 3 - GET DATA and RETURN IT IN THE CORRECT FORMAT
    const fileBuffer = fs.readFileSync(filePath);
    if (format === "buffer") return fileBuffer;
    const fileContent = fileBuffer.toString();
    var json = JSON.parse(fileContent);
    return json
}

export function saveImageOnLocalFile(imgUrl: string, filePath: string) {
    return new Promise(async (resolve, reject) => {
        try {

            const { fileName, folders } = extractImgFileNameAndFolders(filePath)
            if (!isStringValid(fileName) || !fileName) return reject("bad-file-name")
            const response = await axios.get(imgUrl, { responseType: "arraybuffer" })
            const body = Buffer.from(response.data, "binary")

            let currentPath = path.join(process.env.HOME ?? "", "Desktop");
            for (const folder of folders) {
                currentPath = path.join(currentPath, folder);
                if (!fs.existsSync(currentPath)) {
                    fs.mkdirSync(currentPath);
                }
            }

            const localFilePath = path.join(currentPath, fileName);
            fs.writeFileSync(localFilePath, body);
            resolve(`✅ image saved`)

        } catch (error) {
            reject(error)
        }
    })
}

/** @param url the url pointing to the image, e.g. "https://cdn.domain.com/image.jpg" */
export const getImageBuffer = async (url: string) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
};

/** The file is stored on the hardware. */
export function getLocalFileBuffer(path: string) {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile(path, (err, buffer) => {
            if (err) {
                console.error('Error reading file:', err);
                reject('Error reading file');
            } else {
                resolve(buffer);
            }
        });
    })
}

/**
 * 
 * @param sentences 
 * 
 * @param maxBatchLength       the max lenght a batch's string should be.
 * 
 *        WARNING:             the function does not support trimming a sentence if its lenght 
 *                             exceeds the maxBatchLength so make sure to choose a large 
 *                             enought value for instance 1000 (most sentences won't be longer 
 *                             than 1000 characters) SEE @param enforceMaxLength
 * 
 * @param enforceMaxLength     trims sentences by word if a sentence is longer than the maxBatchLength, 
 *                             e.g. if a sentence is 2200 characters long with maxBatchLength set to
 *                             1000 the sentence will be splitted into 1000, 1000 and 200 characters
 *                             long strings
 * 
 * @returns 
 */
export function groupSentencesIntoBatches(
    sentences: string[],
    maxBatchLength: number,
    enforceMaxLength = false
) {
    return sentences.reduce((batches, sentence) => {

        // last index 
        const idx = batches.length - 1
        const updatedString = `${(batches.length === 0) ? "" : batches[idx]}${sentence}`

        if (updatedString.length <= maxBatchLength) {
            // CASE A: CONCATENATE with last string or INIT if no prev sentence
            if (batches.length === 0) { // init 
                batches.push(sentence);
                //      console.log("INIT");
                return batches
            };
            // concatenate
            batches[idx] = updatedString;
            //      console.log(`${!enforceMaxLength ? "    " : ""}A: ${updatedString.length}`);
            return batches
        }
        else if ((sentence.length > maxBatchLength) && enforceMaxLength) {
            // CASE B: sentence is longer than allowed limit
            var words = sentence.split(CONSTANTS.REGEX.WHITESPACE)
                .flatMap(w => { return `${w} ` });
            // trim the sentence by splitting it into batches with its words
            //      console.log(`--->B ${sentence.length}`);
            var words_batches = groupSentencesIntoBatches(words, maxBatchLength);
            batches = [...batches, ...words_batches];
            return batches
        }
        else {
            // CASE C: create new string
            batches.push(sentence);
            //      console.log(`${!enforceMaxLength ? "    " : ""}C: ${updatedString.length}`);
            return batches
        }
    }, [] as string[])
};