/**
 * InternalData.ts
 * version 1.0.0
 * 
 * Created on the 18/03/2023
 */

// INTERNAL DATA
export interface InternalCompletionOutputData {
    completion: string
    prompt: string
    // params: {
    model: string
    max_tokens: number
    temperature: number
    frequency_penalty: number
    presence_penalty: number
    // }
    // more_info: {
    created_at: string
    usage: any
    // }
}
export const InternalCompletionOutput = {
    object(
        completion: string,
        prompt: string,
        model: string,
        max_tokens: number,
        temperature: number,
        frequency_penalty: number,
        presence_penalty: number,
        created_at: string,
        usage: any) {
        return {
            completion: completion,
            prompt: prompt,
            model: model,
            max_tokens: max_tokens,
            temperature: temperature,
            frequency_penalty: frequency_penalty,
            presence_penalty: presence_penalty,
            created_at: created_at,
            usage: usage,
        }
    }
}


// INTERNAL DATA
export interface FineTuningData {
    prompt: string
    completion: string
}
export const FineTuning = {
    object(prompt: string, completion: string) {
        return {
            prompt: prompt,
            completion: completion,
        }
    }
}
