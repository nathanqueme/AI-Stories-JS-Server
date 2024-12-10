/**
 * openaiConfig.ts
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

import { Configuration, OpenAIApi } from "openai"

const useKeyNumb2 = false

export const openaiConfig = new Configuration({
    apiKey: process.env[useKeyNumb2 ? "OPENAI_API_KEY_ACCOUNT_2" : "OPENAI_API_KEY"],
})

export const PROMPTS = {
    STORY: {
        CREATE_V1: process.env.WRITE_STORY_V1 ?? "",
        CREATE_V2: process.env.WRITE_STORY_V2 ?? "",
        CONTINUE_V1: process.env.CONTINUE_UNFINISHED_STORY_V1 ?? "",
        CREATE_STORY_PROMPTS_V1: process.env.CREATE_STORY_PROMPTS_V1 ?? "",
        CREATE_STORY_PROMPTS_V2: process.env.CREATE_STORY_PROMPTS_V2 ?? "",
    },
    EMOJIS: {
        WORD_TO_EMOJI_V1: process.env.WORD_TO_EMOJI_V1 ?? ""
    },
    IMAGES: {
        ONE_LINE_DRAWING_V1: process.env.ONE_LINE_DRAWING_V1 ?? "",
        ONE_LINE_DRAWING_V2: process.env.ONE_LINE_DRAWING_V2 ?? "",
        ONE_LINE_DRAWING_V3: process.env.ONE_LINE_DRAWING_V3 ?? "",
        ONE_LINE_DRAWING_V4: process.env.ONE_LINE_DRAWING_V4 ?? "",
    }
}

export const openAIApi = new OpenAIApi(openaiConfig)