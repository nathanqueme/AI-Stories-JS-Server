//
//  comprehend.ts
//  atsight_apis
//
//  Created by Nathan Queme the 10/04/22
//

import { comprehendClient } from '../clients'
import { DetectDominantLanguageCommand, DetectDominantLanguageCommandInput } from '@aws-sdk/client-comprehend'


/** 
 * Detects the language the provided text is written. 
 * If multiple languages are detected the one with the highest score is used.
 * 
 * @returns the language's code e.g. : 'fr' for French.
 * 
 * SUPPORTED locales : https://docs.aws.amazon.com/comprehend/latest/dg/how-languages.html
 */
export function getMainLanguageLocale(text: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            const params: DetectDominantLanguageCommandInput = {
                Text: text
            } 
            const result = await comprehendClient.send(new DetectDominantLanguageCommand(params))
            let mainLanguageLocale = (result?.Languages ?? [])[0].LanguageCode ?? "en" // fallback to english
            resolve(mainLanguageLocale)

        } catch (error) {
            reject(error)
        }
    })
}


export function correctGrammar(sentence: string) {
    return new Promise(async (resolve, reject) => {
     
        try {
            // TODO...
        } catch (error) {
            reject(error)
        }
    })
}
