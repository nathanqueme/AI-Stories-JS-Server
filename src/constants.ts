/**
 * variables.ts
 * version 1.0.0
 * 
 * Created on the 03/02/2023
 */

import { mainConfig } from "./backend/configs"

const { production } = mainConfig

const CONSTANTS = {
    URLS: {
        CDN_URL: "https://cdn.minipixkids.com"
    },
    MODERATION: {
        GET_QUERIES: {
            // THE MAXIMUM QTY OF STORIES TO OUTPUT IN A GET QUERY
            MAX_STORIES: 20
        }
    },
    MODELS: {
        OPENAI: {
            CURIE_1: "text-curie-001",
            DAVINCI_3: "text-davinci-003",
        }
    },
    UNWANTED_WORDS_IN_GENERATED_STORY: [
        "Intro: ", "intro:", "Intro :", "intro :",
        "Description:", "description:", "Description :", "description :",
        "Description 1:", "description 1:", "Description 1 :", "description 1 :",
        "Description 2:", "description 2:", "Description 2 :", "description 2 :",
        "Description 3:", "description 3:", "Description 3 :", "description 3 :",
        "Outro:", "outro:", "Outro :", "outro :",
    ],
    REGEX: {
        // https://stackoverflow.com/a/69866962
        EMOJI: /((\ud83c[\udde6-\uddff]){2}|([\#\*0-9]\u20e3)|(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])((\ud83c[\udffb-\udfff])?(\ud83e[\uddb0-\uddb3])?(\ufe0f?\u200d([\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])\ufe0f?)?)*)/g,
        LINE_BREAK: /\r?\n|\r/g,
        WHITESPACE: /\s/g,
        LETTERS_AND_NUMBERS: `[A-Za-z0-9]`
    },
    /** Logs are automatically disabled on production */
    LOGS: !production,
}
export default CONSTANTS